# Architecture candidate

> Statut : **Phase 0 — en revue**
> Dernière mise à jour : 2026-08-11
> Les décisions marquées **[ADR-xxxx]** sont formalisées dans [`adr/`](./adr/).

---

## 1. Vue d'ensemble

### 1.1 Les deux couches

```text
                        content/**/*.md(x)
                     (source de vérité unique)
                                │
                                ▼
                    ┌───────────────────────┐
                    │     CONTENT LAYER     │   pur TypeScript
                    │  read → parse → valid │   aucune dépendance React
                    │      → normalize      │   aucune dépendance Three.js
                    └───────────┬───────────┘
                                │  objets typés (Experience, Project, Skill)
                ┌───────────────┴────────────────┐
                ▼                                ▼
   ┌────────────────────────┐        ┌────────────────────────┐
   │   COUCHE DOCUMENTAIRE  │        │    COUCHE IMMERSIVE    │
   │  React Server Comp.    │        │  React Three Fiber     │
   │  HTML / SSG / SEO      │◀──────▶│  caméra / écrans / anim│
   │  a11y / i18n / nav     │  état  │  interactions spatiales│
   └───────────┬────────────┘        └───────────┬────────────┘
               │                                 │
               └────────────────┬────────────────┘
                                ▼
                       Next.js App Router
                  (source de vérité de l'état de nav.)
```

**Règle d'or** : la flèche entre les deux couches ne transporte **jamais de contenu métier**,
uniquement de l'**état de navigation** (quelle section est active) et des **ancres géométriques**
(où se trouve tel écran). Le contenu ne descend que par la branche gauche. [ADR-0001], [ADR-0004]

### 1.2 Dépendances autorisées entre modules

```text
content/  ──────▶  i18n
i18n/     ──────▶  (rien)
routing/  ──────▶  i18n
scene/    ──────▶  routing, i18n          ✗ jamais content
app/      ──────▶  content, i18n, routing, ui, scene
ui/       ──────▶  i18n
features/resume/  ──────▶  i18n
seo/      ──────▶  i18n, routing
```

> **Corrigé le 2026-08-11 (P1-05), au moment d'écrire la règle.** Deux écarts par rapport à la
> rédaction initiale, tous deux signalés plutôt qu'appliqués en silence :
>
> - **`app → scene` ajouté.** Cette liste l'omettait, alors que §5.1 fait monter le canvas par
>   `app/[locale]/layout.tsx`. Les deux passages du même document se contredisaient ; tranché en
>   faveur de §5.1, `app` étant le seul endroit où les deux couches peuvent se rencontrer.
> - **`seo` ajouté.** Le dossier figure dans l'arborescence de §8 mais dans aucune liste de
>   dépendances. Contrainte posée par défaut, **à confirmer en P3-06** quand les métadonnées seront
>   réellement écrites.
>
> **Modifié le 2026-08-12 (P2-02) : `content → i18n` est autorisé.** La rédaction initiale
> (`content → rien`) rendait impossible ce que §3.3 exige au même moment : une API de contenu
> **typée par locale**. Les deux issues étaient une seconde liste de locales dans `src/content` — donc
> deux sources de vérité destinées à diverger — ou cette autorisation. `i18n` ne dépendant de rien,
> aucun cycle n'est possible, et la couche Content reste du TypeScript pur sans React, sans Next et
> sans Three.js : c'est cela que CT-09 protège, et non l'absence de tout import. Le vocabulaire des
> locales est écrit dans `src/i18n/locales.ts`, que P3-01 complète au lieu de le recréer.
> Détail : [`phase-2-log.md`](./phase-2-log.md) §7.

Contrainte vérifiée automatiquement par une règle ESLint (`import/no-restricted-paths`) — tâche
`P1-05`. Elle rend l'ADR-0001 exécutable plutôt que déclaratif : une régression échoue au lint,
pas à la relecture. **Vérifiée par échec observé** : sept violations volontaires ont été introduites
puis retirées, dont deux que la première version de la règle laissait passer (les imports par alias
`@/…`, faute de `paths` dans `tsconfig.json` — c'est-à-dire la totalité des imports réels).

S'y ajoutent deux interdictions par motif, hors graphe : `src/content/**` ne peut importer ni React,
ni Next, ni Three.js (CT-09) ; `src/scene/state/**` ne peut importer Three.js (CT-10).

---

## 2. Environnement de développement — Docker [ADR-0007]

### 2.1 Principe

Aucun outil Node n'est installé sur l'hôte. Tout passe par des conteneurs. L'hôte n'a besoin que
de Docker et de Git.

```text
Hôte (WSL2)                          Conteneurs
───────────                          ──────────
/home/aurel/projects/portfolio  ──▶  service "web"    (dev server, lint, typecheck, unit tests)
       (bind mount)                  service "e2e"    (Playwright + navigateurs)
                                     volume "node_modules"   ← jamais visible depuis l'hôte
                                     volume "next_cache"
```

### 2.2 Étages de l'image

```text
Dockerfile
├── base     node:<LTS>-bookworm-slim, pnpm activé via corepack, user "node"
├── deps     installation des dépendances à partir du lockfile seul (cache maximal)
├── dev      + outils de dev, CMD "pnpm dev"            ← service "web"
├── build    pnpm build (output: "standalone")
└── runner   image de production minimale, non-root     ← auto-hébergement éventuel
```

L'étage `runner` **est l'artefact de production** : c'est exactement cette image qui tourne sur le
VPS (§7). Dev et production partagent donc la même base, la même version de Node et le même
lockfile. C'est le principal bénéfice de la conjonction Docker + auto-hébergement.

### 2.3 Points de vigilance retenus

| Problème classique | Traitement |
|---|---|
| `node_modules` de l'hôte écrasant celui du conteneur (binaires natifs incompatibles) | Volume **nommé** monté sur `/app/node_modules`, jamais bind-mounté. |
| Fichiers créés en `root` dans le dépôt | Conteneur exécuté en `node` avec UID/GID de l'hôte (`user: "${UID}:${GID}"`, valeurs dans `.env`). |
| Hot reload muet | Projet dans le FS natif WSL2 (`/home/aurel/...`, pas `/mnt/c/...`) → inotify fonctionne. Le polling (`WATCHPACK_POLLING`) reste un repli documenté, **pas** un réglage par défaut (coût CPU). |
| Playwright lourd dans l'image de dev | Service **séparé** basé sur l'image officielle `mcr.microsoft.com/playwright`, qui cible `http://web:3000`. |
| Divergence de version Node | Une seule source : l'argument `NODE_VERSION` du Dockerfile, **lu** par la CI (jamais recopié) et répliqué dans `engines`. |
| Cache `.next` détruit à chaque rebuild | Volume nommé dédié. |
| *(constaté en P1-02)* Points de montage créés en `root` par le démon | Le `Makefile` crée `node_modules/` et `.next/` **avant** le montage, avec la propriété de l'hôte. |
| *(constaté en P1-03)* Store pnpm déversé sur l'hôte (355 Mo) | `storeDir` forcé dans le volume `node_modules` via `pnpm-workspace.yaml` — seul emplacement lu par pnpm 11. |

### 2.4 Interface de commandes

Un `Makefile` (ou un script `./x`) expose une interface stable, pour que les commandes
documentées ne changent jamais même si l'orchestration évolue :

```text
make up          docker compose up web
make install     pnpm install dans le conteneur
make lint / typecheck / test / test:watch / coverage / build
make e2e         docker compose run --rm e2e
make sh          shell dans le conteneur web
make ci          enchaîne tous les gates, comme la CI
```

**Justification du choix (dépendance structurante)** — voir [ADR-0007] pour le détail :
problème (parité d'environnement, aucun Node sur l'hôte, WSL2), alternatives évaluées
(nvm sur l'hôte, devcontainer VS Code, Nix), et pourquoi Docker Compose + Makefile est retenu.

---

## 3. Content Layer [ADR-0001]

### 3.1 Arborescence de contenu

```text
content/
├── fr/
│   ├── experiences/evea.md
│   ├── projects/augure.mdx
│   └── skills/typescript.md
└── en/
    ├── experiences/evea.md
    ├── projects/augure.mdx
    └── skills/typescript.md
```

Le **nom de fichier fait foi** pour le slug (le champ `slug` du frontmatter doit correspondre,
sinon erreur de build : une seule vérité, vérifiée).

### 3.2 Pipeline

```text
readdir(content/{locale}/{type})
      ▼
lecture fichier
      ▼
découpage `---` + yaml  → { frontmatter: unknown, body: string }
      ▼
Zod schema par type  → échec = throw (build cassé)   ◀── exigence CF-10
      ▼
normalisation (dates ISO, tri, dérivations)
      ▼
index en mémoire, mémoïsé pour la durée du processus
      ▼
API de repository typée
```

> **Deux étapes modifiées le 2026-08-12 (P2-03), après vérification.**
>
> - **`gray-matter` → `yaml`.** `gray-matter` s'appuie sur `js-yaml` en schéma YAML 1.1, qui
>   convertit `2024-01-15` en objet `Date` — constaté à l'exécution, pas déduit. Nos schémas
>   attendent une chaîne ISO : il faudrait reconvertir chaque date, en traversant des questions de
>   fuseau horaire, pour revenir à ce que l'auteur avait écrit. Le paquet `yaml` applique le schéma
>   **core de YAML 1.2** : une date reste une chaîne, et `yes` reste `"yes"`. Il est par ailleurs
>   sans dépendance et publié en 2026, contre quatre dépendances et 2021.
> - **Cache par requête → mémoïsation à la durée du processus.** Le cache annoncé était celui de
>   React (`cache()`), que la couche Content ne peut pas importer (CT-09) — les deux lignes du
>   document se contredisaient. Le contenu ne changeant qu'au déploiement (pas d'ISR, H-05) et les
>   pages étant générées au build, une mémoïsation par processus est **strictement plus forte**
>   qu'une mémoïsation par requête. Détail : [`phase-2-log.md`](./phase-2-log.md) §9.

### 3.3 API exposée (esquisse, figée en Phase 2)

```ts
getAllProjects(locale: Locale): Promise<Project[]>
getProjectBySlug(locale: Locale, slug: string): Promise<Project | null>
getAllExperiences(locale: Locale): Promise<Experience[]>
getExperienceBySlug(locale: Locale, slug: string): Promise<Experience | null>
getAllSkills(locale: Locale): Promise<Skill[]>
getContentLocales(type: ContentType, slug: string): Promise<Locale[]>  // pour hreflang
```

`getContentLocales` est ce qui permet de n'émettre un `hreflang` que vers des pages qui existent
réellement (risque R-07).

### 3.4 Modèle de données

```ts
type Locale = 'fr' | 'en'

interface Project {
  slug: string
  title: string
  summary: string            // sert aussi de meta description
  type: 'personal' | 'professional' | 'open-source'
  featured: boolean
  technologies: string[]     // valeurs contrôlées, croisées avec les Skills
  startedAt: string          // ISO
  endedAt?: string
  links?: { repository?: string; demo?: string }
  cover?: { src: string; alt: string; width: number; height: number }
  body: string               // MDX brut, compilé côté rendu
}

interface Experience {
  slug: string
  company: string
  role: string
  location?: string
  startedAt: string
  endedAt?: string           // absent ⇒ poste en cours
  technologies: string[]
  highlights: string[]
  body: string
}

interface Skill {
  slug: string
  name: string
  category: 'language' | 'framework' | 'tooling' | 'infrastructure' | 'practice'
  level: 1 | 2 | 3 | 4 | 5
  featured: boolean
  body: string
}
```

**Cohérence référentielle** : `Project.technologies` et `Experience.technologies` doivent
correspondre à des `Skill.slug` existants. Vérifié par un test d'intégration exécuté dans les
gates — c'est un cas typique où le typage ne suffit pas.

### 3.5 MDX

MDX est utilisé pour le **corps** des projets et expériences (encadrés, images légendées, blocs de
code). Compilation côté serveur au rendu (RSC), avec une liste blanche de composants. Aucun MDX
n'est envoyé au client.

**Décision différée** (bibliothèque MDX exacte : `next-mdx-remote/rsc` vs `@next/mdx` vs
compilation `mdx-js` maison) : tranchée en début de Phase 2, car elle dépend d'une vérification de
compatibilité de version. Le contrat de la couche (`body: string` compilé au rendu) est, lui, figé
dès maintenant, donc le choix reste substituable.

---

## 4. Routage et i18n [ADR-0002] [ADR-0005]

### 4.1 Carte des routes

```text
/                                → redirection vers la locale (négociation Accept-Language)
/[locale]                        → accueil (scène + sommaire documentaire)
/[locale]/experiences            → liste
/[locale]/experiences/[slug]     → détail
/[locale]/projects               → liste
/[locale]/projects/[slug]        → détail
/[locale]/skills                 → liste (pas de page de détail en v1)
/[locale]/about                  → à propos (Phase 9)
/[locale]/contact                → contact + demande de CV (Phase 10)
/sitemap.xml  /robots.txt  /[locale]/opengraph-image
```

Les **segments de route ne sont pas traduits** en v1 (`/fr/projects`, pas `/fr/projets`).
Justification : l'ADR-0005 pèse le gain SEO marginal contre le coût (table de correspondance
bidirectionnelle, réécriture de tous les liens, hreflang plus fragile). Décision réversible :
une table `routeSegments[locale][section]` est prévue dès la Phase 3 pour rendre le changement
local, même si elle est l'identité en v1.

### 4.2 Stratégie de rendu

| Route | Stratégie | Motif |
|---|---|---|
| Toutes les pages de contenu | **SSG** via `generateStaticParams` | Contenu figé au build, TTFB minimal, indexation optimale |
| `/` | Redirection (edge) | Négociation de langue |
| Server Action CV | Runtime Node | Effet de bord, secrets |
| `sitemap.xml`, `robots.txt` | Générés au build | Dérivés du Content Layer, jamais écrits à la main |

Aucun ISR en v1 : le contenu ne change qu'au déploiement (H-05).

### 4.3 Internationalisation

- **Contenu éditorial** → fichiers Markdown par locale. Jamais de JSON.
- **Chaînes d'interface** (« Voir le projet », « Retour », labels de formulaire) → dictionnaires
  TypeScript typés, une clé = une constante, complétude vérifiée par le compilateur :

```ts
// i18n/messages/fr.ts et en.ts partagent le même type dérivé de fr
type Messages = typeof fr
const en: Messages = { ... }   // toute clé manquante = erreur TypeScript
```

Aucune bibliothèque i18n n'est introduite en v1 : le formatage des dates et des nombres est fourni
par `Intl` (plateforme), la pluralisation par `Intl.PluralRules`. Le déclencheur pour adopter
`next-intl` est écrit dans l'ADR-0005 (messages riches ICU, interpolation complexe, ou 3e locale
avec traducteur externe).

### 4.4 Résolution de locale

```text
URL /[locale]  ──▶  parseLocale()  ──▶  Locale | null
                                            │
                              null ──▶ notFound() (404, pas de redirection silencieuse)
```

`/` seule fait une négociation `Accept-Language`, avec repli sur `fr` (H-04).

---

## 5. Couche immersive [ADR-0003] [ADR-0004]

### 5.1 Montage du canvas

```text
app/[locale]/layout.tsx  (RSC)
   ├── <SceneMount />              client, dynamic(ssr:false)
   │       ├── détection de capacité (WebGL2, mémoire, prefers-reduced-motion, viewport)
   │       ├── si inapte  ──▶ ne monte rien (aucun coût, aucun message d'erreur)
   │       └── si apte    ──▶ import dynamique du bundle 3D, montage du <Canvas>
   └── <main>  contenu documentaire rendu côté serveur  </main>
```

Points structurants :

1. Le canvas est **au-dessus** du layout de route, donc **il n'est jamais démonté** lors d'une
   navigation entre sections → pas de rechargement d'assets, pas de fuite GPU (R-10).
2. Le canvas est `aria-hidden="true"` et hors du flux de tabulation. Il ne porte **aucune**
   information.
3. Le contenu documentaire est rendu par le serveur, indépendamment du canvas — c'est ce que voit
   un crawler, un lecteur d'écran, et un utilisateur sans WebGL.
4. Le bundle 3D est chargé **après** l'interactivité du contenu (idle callback), jamais en
   concurrence avec le LCP.

### 5.2 Paliers de capacité

| Palier | Détection | Expérience |
|---|---|---|
| `full` | WebGL2, desktop, pointeur fin, pas de reduced-motion | Scène complète, transitions de caméra |
| `reduced` | reduced-motion demandé, ou device de moyenne gamme | Scène rendue, **coupes de caméra instantanées**, animations d'ambiance désactivées |
| `lite` | Mobile, ou WebGL2 absent mais WebGL1 présent, ou peu de mémoire | Scène décorative non interactive, ou image statique de la scène |
| `none` | Pas de WebGL, JS désactivé, échec de chargement, `save-data` | Documentaire pur |

La détection est une **fonction pure et testable** (`resolveCapabilityTier(input): Tier`), séparée
de la lecture des API navigateur. Chaque palier est atteignable en test via une injection.

### 5.3 État de scène dérivé de la route [ADR-0002]

```text
        URL (source de vérité)
              │
              ▼
   resolveSceneState(pathname)          fonction pure, zéro import Three.js
              │
              ▼
      SceneState { focus: 'overview' | 'experiences' | 'projects' | 'skills',
                   detail: string | null }
              │
              ▼
   getCameraTarget(state)               fonction pure → { position, lookAt, fov }
              │
              ▼
   useCameraTransition()                seul module qui touche Three.js
```

Dans l'autre sens :

```text
   clic / Entrée sur l'écran « Projets »
              │
              ▼
   getRouteForScreen('projects', locale)   fonction pure → '/fr/projects'
              │
              ▼
   router.push(...)        ← la scène ne bouge PAS ici
              │
              ▼
   la route change → resolveSceneState → la caméra suit
```

La scène ne modifie jamais son propre état directement. Une seule direction de flux, donc pas de
désynchronisation possible (R-03), et le `back` navigateur fonctionne gratuitement.

### 5.4 Interfaces des écrans [ADR-0004]

**Décision** : le contenu affiché « sur » les moniteurs est du **DOM standard**, superposé au
canvas et positionné par projection des coordonnées de l'écran 3D, et non du texte rasterisé en
texture, ni (par défaut) du `<Html transform>` de drei.

Une **instance unique** de chaque bloc de contenu existe dans le DOM : en mode immersif, elle est
déplacée par un **portail React** vers le conteneur superposé. Aucun contenu n'est dupliqué (R-01),
donc pas de double lecture par lecteur d'écran ni de contenu dupliqué pour les crawlers.

Motifs détaillés et alternatives dans [ADR-0004] : lisibilité du texte, coût de `<Html transform>`,
accessibilité, et possibilité d'y revenir localement pour des éléments décoratifs.

---

## 6. Envoi du CV [ADR-0006]

```text
<form action={requestResume}>            ← Server Action : fonctionne sans JavaScript
        │
        ▼
  validation Zod (format e-mail, longueur, honeypot vide, délai de soumission plausible)
        │
        ▼
  RateLimiter.consume(clefIP) + RateLimiter.consume(clefEmail) + plafond global journalier
        │
        ▼
  ResumeSender.sendResume(email, locale)      ← interface métier
        │
        ├── MailjetResumeSender     (production — API Send v3.1, fetch natif)
        ├── FakeResumeSender        (tests, simulation de panne)
        └── ConsoleResumeSender     (dev local sans identifiants)
        │
        ▼
  réponse neutre et identique en cas de succès comme d'échec côté transport
```

Garde-fous contre l'usage en relais de spam (R-06) :

- Le sujet, le corps et la pièce jointe sont **entièrement fixes**. Rien de ce que saisit
  l'utilisateur n'entre dans le message, sauf l'adresse du destinataire.
- Limites : par IP (fenêtre courte), par adresse e-mail (fenêtre longue), et plafond global
  journalier qui coupe le service plutôt que de laisser filer une facture ou une réputation.
- Aucune persistance de l'adresse (CF-08). Les clés de rate limit sont **hachées** et expirent.
- Réponse indistinguable entre « envoyé » et « limite atteinte silencieusement » du point de vue
  d'un scanner ? Non : le rate limit renvoie un message explicite (utilisabilité), mais **jamais**
  d'information sur l'existence ou l'historique d'une adresse.

`ResumeSender` et `RateLimiter` sont deux interfaces à un seul verbe. C'est ce qui permet de tester
tout le workflow sans envoyer un seul e-mail (Phase 10) et de changer de fournisseur (CT-07) sans
toucher au métier.

**Conséquence de l'auto-hébergement mono-instance** : le processus Node est unique et durable, donc
un `RateLimiter` **en mémoire** est réellement correct — contrairement à un déploiement serverless
où il serait illusoire. On évite donc Redis en v1. Deux réserves, assumées et documentées :

- un redémarrage du conteneur remet les compteurs à zéro ; le **plafond global journalier** est
  donc persisté sur un petit volume disque, pas seulement en mémoire ;
- si l'on passait un jour à plusieurs répliques, l'implémentation devrait changer — l'interface
  `RateLimiter` rend ce changement local. Déclencheur écrit dans [ADR-0006].

---

## 7. Déploiement — VPS auto-hébergé [ADR-0008]

### 7.1 Chaîne complète

```text
git push
   │
   ▼
GitHub Actions ─── gates (lint, typecheck, tests, coverage, build, e2e)
   │                     │ rouge ⇒ arrêt, rien n'est publié
   ▼
docker build --target runner       image Next.js "standalone", non-root
   │
   ▼
push GHCR   ghcr.io/<owner>/portfolio:<sha>  + :latest
   │
   ▼
déploiement SSH (clé dédiée, commande restreinte)
   │   docker compose pull && docker compose up -d
   │
   ▼
VPS
 ├── Caddy          TLS automatique, en-têtes de sécurité, cache des assets
 └── portfolio:<sha>  Node standalone, port interne uniquement
```

### 7.2 Topologie sur le VPS

```text
Internet
   │  (option : CDN/proxy en frontal — H-01b)
   ▼
:443 Caddy  ← pile "edge", indépendante des projets
   │            réseau Docker externe partagé "web"
   ├──▶ portfolio:3000        (aucun port publié)
   │      ├── /_next/static/*   cache immuable, 1 an
   │      ├── /models,/textures cache long, versionné par nom de fichier
   │      └── /*                proxy vers Next.js
   │
   └──▶ (autres projets à venir sur ce VPS)
```

Le VPS est dédié au portfolio **aujourd'hui**, mais destiné à accueillir d'autres projets. Le proxy
est donc conçu dès maintenant comme une pile autonome : le portfolio le rejoint par un réseau
externe partagé, et son cycle de vie (déploiement, rollback, arrêt) n'affecte jamais le TLS des
autres sites. Rétrofitter ce découplage au moment du deuxième projet coûterait une interruption de
service ; le faire maintenant coûte quelques lignes.

Choix du reverse proxy : **Caddy**. Problème à résoudre : TLS, HTTP/2-3, en-têtes, cache statique,
sans charge d'exploitation. Alternatives pesées dans [ADR-0008] (Nginx + certbot : plus de pièces
mobiles pour le même résultat ; Traefik : pertinent à partir de plusieurs services). Renouvellement
de certificat automatique = suppression directe du risque R-15 le plus probable.

### 7.3 Conséquences architecturales de l'auto-hébergement

| Sujet | Conséquence | Traitement |
|---|---|---|
| Rate limiting | Instance unique et durable ⇒ mémoire viable | §6, pas de Redis en v1 |
| Distribution | Origine mono-région ⇒ TTFB distant dégradé (R-16) | SSG intégral, cache CDN, mesure multi-région en Phase 11 |
| Optimisation d'images | Elle consomme le CPU du VPS, pas celui d'un fournisseur | Images pré-dimensionnées au build, `sharp` présent dans l'image, cache disque persistant |
| Secrets | Fichier `.env` sur le VPS, permissions `600`, hors dépôt | Validation Zod au démarrage : un secret manquant fait échouer le boot, pas une requête sur trois |
| État à sauvegarder | Quasi nul : contenu et code sont dans Git | Sauvegarde limitée au fichier d'environnement et au compteur journalier |
| Rollback | Images taguées par SHA | `docker compose up -d` sur le tag précédent (R-18) |
| Supervision | Aucun tableau de bord fourni | Healthcheck conteneur + sonde externe avec alerte (Phase 15) |
| Sécurité de l'hôte | À ma charge (R-17) | Pare-feu fermé par défaut, SSH par clé, mises à jour automatiques, audit Phase 14 |

### 7.4 Environnements

| Environnement | Support | Usage |
|---|---|---|
| `local` | Docker Compose, service `web` | Développement |
| `ci` | Runners GitHub | Gates + construction d'image |
| `production` | VPS, image `runner` | Site public |

Pas d'environnement de préproduction en v1 (mainteneur unique, H-10). Le filet de sécurité est le
couple *gates verts + rollback par tag*. Un environnement de préproduction devient justifié le jour
où une modification ne peut plus être validée par la seule CI.

---

## 8. Arborescence du projet (cible)

```text
portfolio/
├── Dockerfile                 étages base/deps/dev/build/runner
├── docker-compose.yml         développement : services web + e2e
├── docker-compose.prod.yml    production VPS : portfolio + caddy
├── deploy/
│   ├── Caddyfile
│   └── README.md              provisionnement du VPS, rollback, restauration
├── Makefile                   interface de commandes stable
├── content/                   SOURCE DE VÉRITÉ
│   ├── fr/{experiences,projects,skills}/
│   └── en/{experiences,projects,skills}/
├── public/
│   ├── models/                .glb (Draco/Meshopt)      — Phase 8
│   ├── textures/              .ktx2 / .webp             — Phase 8
│   └── resume/                CV PDF par locale
├── src/
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── layout.tsx           documentaire + montage scène
│   │   │   ├── page.tsx
│   │   │   ├── experiences/{page,[slug]/page}.tsx
│   │   │   ├── projects/{page,[slug]/page}.tsx
│   │   │   └── skills/page.tsx
│   │   ├── sitemap.ts  robots.ts  not-found.tsx  error.tsx
│   ├── content/               parsing, schémas Zod, repositories   ← zéro React
│   ├── i18n/                  locales, dictionnaires, négociation
│   ├── routing/               construction et analyse d'URL
│   ├── scene/
│   │   ├── state/             PUR : mapping route ↔ scène, cibles caméra   ← zéro Three.js
│   │   ├── components/        R3F : Canvas, Desk, Monitor, Rig
│   │   └── capability/        détection de palier (pure + adaptateur navigateur)
│   ├── ui/                    composants documentaires réutilisables
│   ├── features/resume/       action, schéma, ResumeSender, RateLimiter
│   └── seo/                   metadata, JSON-LD, hreflang
├── tests/
│   ├── unit/  integration/  e2e/  fixtures/
├── docs/                      vision, architecture, tests, perf, roadmap, adr/
└── .github/workflows/ci.yml
```

`src/scene/state/` sans aucun import Three.js est la condition qui rend la Phase 6 testable en
Vitest pur (CT-10). C'est vérifié par la règle ESLint de §1.2.

---

## 9. SEO

| Élément | Mise en œuvre | Phase |
|---|---|---|
| `title` / `description` | `generateMetadata` par route, alimenté par le Content Layer | 3–4 |
| `canonical` | URL absolue de la locale courante | 3 |
| `hreflang` | Uniquement vers les locales **réellement existantes** pour cette entité + `x-default` | 3 |
| OpenGraph / Twitter | `opengraph-image` généré, ou image dédiée par projet | 4 |
| `sitemap.xml` | Dérivé du Content Layer, avec `alternates` par locale | 3–4 |
| `robots.txt` | Autorise tout, pointe le sitemap | 3 |
| JSON-LD | `Person` + `WebSite` (accueil), `CreativeWork` (projet), `BreadcrumbList` (détails) | 4 |
| Contenu indexable | Rendu serveur, **jamais** dépendant du canvas | 4 |

Critère vérifiable retenu : **la page rendue avec JavaScript désactivé contient l'intégralité du
texte utile**. Testé en E2E, pas seulement affirmé.

---

## 10. Gestion des erreurs

| Cas | Comportement |
|---|---|
| Slug inexistant | `notFound()` → 404 localisée, avec liens de secours |
| Locale invalide | 404 (pas de redirection deviner-juste, qui pollue l'index) |
| Frontmatter invalide | Échec du **build** (CF-10), jamais de dégradation silencieuse en production |
| Échec de chargement d'un asset 3D | Error boundary du canvas → bascule en palier `none`, le documentaire reste intact |
| Perte du contexte WebGL | Écoute de `webglcontextlost` → démontage propre, bascule `none` |
| Fournisseur e-mail indisponible | Message neutre, journalisation côté serveur, pas de détail exposé |
| Rate limit atteint | Message explicite et poli, HTTP 429 |
| Variable d'environnement manquante | Échec au démarrage, avec le nom de la variable (validation Zod de `env`) |

---

## 11. Ce qui reste ouvert

| Sujet | Décision attendue | Phase |
|---|---|---|
| Bibliothèque MDX exacte | Vérification de compatibilité + arbitrage | 2 |
| Gestionnaire de paquets (pnpm supposé) | Confirmé à l'initialisation | 1 |
| Caractéristiques du VPS et nom de domaine | H-01a, H-07 | 1 |
| CDN en frontal (Cloudflare) | H-01b, à trancher sur mesure réelle | 11 |
| Provenance des modèles 3D | Dépend de H-09 | 8 |
| Segments d'URL traduits | Réversible, table prête dès la Phase 3 | 3 |
| Visual regression testing | Utile seulement si la Phase 8 le justifie | 12 |
</content>
