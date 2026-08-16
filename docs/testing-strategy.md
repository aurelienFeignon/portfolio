# Stratégie de tests

> Statut : **Phase 0 — en revue**
> Dernière mise à jour : 2026-08-11

---

## 1. Principes

1. **Un test protège un comportement, pas une implémentation.** On teste ce que le produit promet
   (§ Vision), pas la forme du code.
2. **Ce qui est difficile à tester est mal découpé.** L'impossibilité de tester la logique de scène
   sans WebGL serait un défaut d'architecture, pas une fatalité de Three.js.
3. **Aucun test n'est supprimé ou affaibli pour verdir la suite** sans justification fonctionnelle
   écrite dans le commit.
4. **Pas de test décoratif.** Un test qui ne peut pas échouer pour une bonne raison est supprimé.
5. **Tout s'exécute dans le conteneur** (ADR-0007) : `make test`, `make e2e`. Une suite qui ne
   passe que sur une machine particulière n'est pas une suite.

---

## 2. Pyramide retenue

```text
                  ▲
                  │      E2E (Playwright)              ~15–25 scénarios
                  │      parcours réels, deep links, a11y, sans WebGL
                  │
                  │   Intégration (Vitest, Node)       ~30–50
                  │   Markdown→page, locale→contenu, action CV + faux provider
                  │
                  │  Composants (Vitest + RTL, jsdom)  ~60–100
                  │  navigation, listes, formulaire, fallback, a11y de base
                  │
                  │ Unitaires (Vitest, Node)           le gros du volume
                  │ parsing, schémas, i18n, routing, état de scène, rate limit
                  ▼
```

Le sommet est **volontairement étroit** : les E2E sont lents et fragiles. On y met ce qui ne peut
être prouvé qu'en conditions réelles (navigation navigateur, absence de WebGL, rendu serveur), et
rien d'autre.

---

## 3. Outillage

| Besoin | Outil | Justification |
|---|---|---|
| Tests unitaires et d'intégration | **Vitest** | Imposé (CT-04). Rapide, ESM natif, compatible TS sans étape de build. |
| Tests de composants | **React Testing Library** | Imposé. Teste par le rôle et le texte accessible, ce qui aligne test et accessibilité. |
| E2E | **Playwright** | Imposé. Multi-navigateurs, émulation de média, interception réseau, injection de scripts avant chargement — indispensable pour simuler l'absence de WebGL. |
| Accessibilité automatisée | **@axe-core/playwright** | Dépendance de test, non structurante. Couvre ~40 % des critères WCAG ; le reste reste manuel (documenté en Phase 12). |
| Couverture | **@vitest/coverage-v8** | Fourni avec Vitest, sans instrumentation supplémentaire. |
| Cloisonnement des couches | **ESLint `import/no-restricted-paths`** | Transforme la règle d'architecture (§1.2 architecture) en test permanent. |

Volontairement **écartés** en v1 :

- `react-three-test-renderer` — l'architecture rend la logique testable en pur ; ce serait tester
  la bibliothèque plutôt que mon code. Réévalué en Phase 6 si un besoin réel apparaît.
- Régression visuelle systématique — coût de maintenance élevé, faux positifs constants. Réévaluée
  en Phase 12, et limitée le cas échéant à 2–3 vues clés avec tolérance.
- Mock Service Worker — le seul appel réseau sortant est masqué par l'interface `ResumeSender` ;
  un faux en mémoire suffit et teste mieux le contrat.

---

## 4. Ce qui est testé, par domaine

### 4.1 Content Layer (Phase 2) — couverture cible ≥ 95 % branches

- Parsing du frontmatter : champs valides, champs manquants, types incorrects, dates malformées.
- Rejet strict : un frontmatter invalide **lève** et fait échouer le build (CF-10) — testé par un
  cas nominal *et* par un cas d'échec, avec un message d'erreur qui nomme le fichier fautif.
- Incohérence `slug` du frontmatter vs nom de fichier → erreur.
- Cohérence référentielle : `technologies` inconnues des Skills → erreur.
- Tri, filtrage (`featured`), dérivations (poste en cours quand `endedAt` est absent).
- Locales : contenu présent dans une seule locale, dossier vide, fichier illisible.
- Corps MDX : le contenu est bien restitué, les composants non autorisés sont rejetés.

Fixtures dédiées dans `tests/fixtures/content/`, **jamais** le contenu réel : les tests ne doivent
pas casser quand j'écris un nouveau projet.

### 4.2 i18n et routing (Phase 3) — couverture cible ≥ 95 % branches

- Lecture d'un segment de locale : `fr`, `en`, `FR`, `de`, chaîne vide, valeur injectée. *(Écrit
  ici comme `parseLocale` ; la fonction livrée est `isLocale`, une **garde de type** — même
  comportement, forme utilisable par l'appelant. Voir `phase-3-log.md` §8.)*
- Négociation `Accept-Language` : correspondances exactes, partielles, pondérations `q`, absence
  d'en-tête, repli sur `fr`.
- Construction d'URL : sections, détails, échappement des slugs, absence de double slash.
- `hreflang` : émis uniquement vers les locales existantes pour l'entité, `x-default` présent — et
  **identique** à ce que le sitemap annonce, vérifié sur toutes les combinaisons de disponibilité.
- Complétude des dictionnaires : garantie par le compilateur, doublée d'un test de non-régression
  sur les clés vides.
- Preuve exigée par la mission : `/fr/projects/augure` et `/en/projects/augure` résolvent chacune
  leur contenu, **indépendamment**, sans fuite de l'une vers l'autre.

### 4.3 État de scène (Phase 6) — couverture cible ≥ 95 % branches, **zéro import Three.js**

```ts
resolveSceneState('/fr/projects')            → { focus: 'projects', detail: null }
resolveSceneState('/en/projects/augure')     → { focus: 'projects', detail: 'augure' }
resolveSceneState('/fr')                     → { focus: 'overview', detail: null }
resolveSceneState('/fr/inconnu')             → { focus: 'overview', detail: null }

getCameraTarget({ focus: 'experiences' })    → position/lookAt de l'écran gauche
getRouteForScreen('skills', 'en')            → '/en/skills'
```

- Aller-retour : `getRouteForScreen` puis `resolveSceneState` redonne le même focus (propriété
  vérifiée sur les trois écrans et les deux locales).
- Le mapping écran ↔ section est testé **exhaustivement** : tout ajout d'écran sans mise à jour du
  mapping échoue.
- Transitions : durée nulle quand `reduced-motion`, interruption d'une transition en cours,
  navigation `back`.
- `resolveCapabilityTier` : chaque palier (`full`/`reduced`/`lite`/`none`) atteignable par entrée
  injectée, y compris les combinaisons contradictoires.

### 4.4 Demande de CV (Phase 10) — couverture cible ≥ 95 % branches

- Validation : adresses valides et invalides (liste de cas), longueur maximale, espaces, casse.
- Honeypot rempli → rejet silencieux, **aucun** envoi.
- Soumission trop rapide → rejet.
- Rate limit : sous le seuil, au seuil, au-delà, expiration de fenêtre, clé IP vs clé e-mail,
  plafond global journalier.
- `FakeResumeSender` : enregistre les appels, permet de simuler une panne du transport.
- Panne du transport → message neutre, aucune fuite (assertion sur le contenu du message).
- **Aucun test n'envoie de véritable e-mail.** Deux garde-fous : la suite échoue si des
  identifiants Mailjet de production sont présents dans l'environnement de test, et
  `MailjetResumeSender` reçoit toujours un `fetch` injecté en test — il n'existe aucun chemin de
  code capable de joindre le réseau depuis la suite.
- `MailjetResumeSender` est testé sur le **contenu réel de la requête** (`fetch` injecté) :
  destinataire, expéditeur, sujet et corps fixes, pièce jointe présente et correctement encodée en
  base64, en-tête d'authentification formé. C'est ce qu'un faux en mémoire ne valide pas, et c'est
  là que se logent les erreurs qui envoient un CV vide ou illisible.
- Le mode bac à sable du fournisseur (validation de la charge utile sans distribution) peut servir
  à une vérification **manuelle** avant release. Il n'entre pas dans la suite automatisée : un test
  qui dépend d'un service externe est un test instable.
- Assertion de sécurité : le corps de l'e-mail est identique quelle que soit l'entrée utilisateur
  (protection anti-relais, R-06).

### 4.5 Composants (Phases 4, 7, 9)

- Listes et pages de détail : rendu des données, états vides.
- Navigation : liens présents, `href` corrects, état actif.
- Sélecteur de langue : cible correcte, conservation de l'entité courante, cas sans traduction.
- Formulaire CV : états `idle` / `pending` / `succès` / `erreur` / `limité`, messages associés à
  leur champ (`aria-describedby`), focus déplacé sur le message de résultat.
- Fallback WebGL : rendu complet du contenu documentaire quand la scène n'est pas montée.
- A11y de base à chaque composant : un seul `h1`, hiérarchie de titres sans saut, images avec
  `alt`, boutons avec nom accessible.

### 4.6 Intégration (Phases 2, 3, 10)

- Fichier Markdown → page rendue (via le vrai Content Layer sur des fixtures).
- Locale → contenu correct, y compris pour une entité présente dans une seule locale.
- Sitemap : contient exactement les entités existantes, avec les bons `alternates`.
- Server Action CV avec `FakeResumeSender` et un `RateLimiter` piloté par une horloge injectée.
- **Non-duplication du contenu** (risque R-01) : un bloc de contenu n'apparaît qu'une fois dans le
  DOM, y compris en mode immersif.

### 4.7 E2E (Playwright)

Projets Playwright configurés :

| Projet | Configuration | But |
|---|---|---|
| `desktop-chromium` | 1440×900, WebGL actif | Parcours immersif complet |
| `mobile-safari` | iPhone, tactile | Parcours mobile |
| `no-webgl` | script d'init neutralisant `getContext('webgl'/'webgl2')` | Prouve CF-12 |
| `no-js` | `javaScriptEnabled: false` | Prouve que le contenu et le formulaire CV existent sans JS |
| `reduced-motion` | `emulateMedia({ reducedMotion: 'reduce' })` | Prouve l'absence d'animation |

Scénarios minimaux exigés :

```text
E2E-01  Accueil → Projets → un projet → retour → Compétences → Expériences
E2E-02  Deep link /fr/projects/augure : contenu, URL, état de scène cohérents
E2E-03  Bascule fr ↔ en sur une page de détail
E2E-04  CV : adresse valide → confirmation
E2E-05  CV : adresse invalide → erreur associée au champ
E2E-06  CV : panne serveur simulée → message neutre
E2E-07  CV : rate limit → message explicite, HTTP 429
E2E-08  Clavier seul : Tab jusqu'aux trois sections, Entrée navigue, focus visible
E2E-09  Sans WebGL : tout le contenu est présent et navigable
E2E-10  Sans JavaScript : contenu présent, formulaire CV fonctionnel
E2E-11  axe-core : 0 violation serious/critical sur accueil, liste, détail, contact
E2E-12  Structure : un h1 unique, titres sans saut de niveau, liens avec nom accessible
E2E-13  Back/forward navigateur : URL et état de scène restaurés
E2E-14  reduced-motion : navigation instantanée, aucune animation de caméra
```

⭐⭐ **Le statut de chacun de ces quatorze scénarios est tenu par un garde, pas par la mémoire**
(P4-12) : `tests/integration/every-e2e-scenario-has-a-status.test.ts` exige de chaque ligne ci-dessus
soit un parcours qui la revendique — une annotation `@covers E2E-xx` en tête de fichier —, soit un
report vers une tâche de `roadmap.md` qui existe. **Ajouter un scénario à cette liste sans lui donner
de statut fait rougir la suite**, ce qui est le but : une liste d'exigences que rien ne confronte au
banc finit par annoncer couvert ce qui ne l'est pas, et c'est arrivé.

**Comment l'« état de scène » est vérifié en E2E sans tester des pixels** : le conteneur de scène
expose son état sous forme d'attribut de données (`data-scene-focus="projects"`), alimenté par la
même fonction pure que la caméra. On assère sur cet attribut. C'est stable, lisible, et cela ne
crée pas de dette : l'attribut sert aussi au débogage.

---

## 5. Trois.js : ce qu'on teste et ce qu'on ne teste pas

| On teste | On ne teste pas |
|---|---|
| `resolveSceneState`, `getCameraTarget`, `getRouteForScreen` | Que Three.js rende un cube |
| Le mapping exhaustif écran ↔ section | Les valeurs de pixels |
| Les règles de transition (durée, interruption, reduced-motion) | Les courbes d'interpolation image par image |
| `resolveCapabilityTier` | Les capacités réelles du GPU du runner CI |
| Le montage/démontage propre du canvas (E2E) | Le contenu du canvas |
| Le nombre de draw calls / triangles (budget, Phase 11) | La qualité esthétique |

Le rendu WebGL en CI n'est **pas** un gate : les runners n'ont pas de GPU, SwiftShader est lent et
non représentatif. Les projets E2E qui exigent WebGL tournent sur `desktop-chromium` avec des
assertions comportementales, pas visuelles.

---

## 6. Couverture

| Périmètre | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| Global (gate CI) | ≥ 80 % | ≥ 75 % | ≥ 80 % | ≥ 80 % |
| `src/content/**` | ≥ 95 % | ≥ 95 % | ≥ 95 % | ≥ 95 % |
| `src/i18n/**`, `src/routing/**` | ≥ 95 % | ≥ 95 % | ≥ 95 % | ≥ 95 % |
| `src/seo/**` *(ajouté en P3-06)* | ≥ 95 % | ≥ 95 % | ≥ 95 % | ≥ 95 % |
| `src/scene/state/**` | ≥ 95 % | ≥ 95 % | ≥ 95 % | ≥ 95 % |
| `src/features/resume/**` | ≥ 95 % | ≥ 95 % | ≥ 95 % | ≥ 95 % |

Exclus de la mesure : `src/scene/components/**` (rendu R3F, couvert par E2E), fichiers de
configuration, types purs, `app/**/layout.tsx` sans logique, et — **ajouté en P3-02** — les routes
de l'App Router (`app/**/page.tsx`, `app/sitemap.ts`, `app/robots.ts`).

**Ce qui rend cette dernière exclusion admissible**, et qui a été fait *pour* la rendre admissible :

- toute décision à branches a été **sortie** des routes, dans des modules couverts — c'est l'origine
  de `src/ui/date-range.tsx` (cas « en cours ») et de `entitySitemapPages` (union des slugs) ;
- ce qui reste est de la composition : lire le dépôt, passer les données à `languageOptions`,
  `pageMetadata`, `buildSitemap` et aux composants de `src/ui`, tous à 100 % ;
- les routes sont exercées par les E2E **contre l'image de production**, ce qu'un rendu jsdom ne
  ferait pas ;
- les couvrir en Vitest supposerait de leur faire lire `content/`, ce que le garde-fou
  d'indépendance des fixtures interdit (P2-09) : un test de page casserait dès que P2-11 réécrit un
  projet.

Le jour où une route se remet à décider quelque chose, la décision se sort de la route — elle ne
justifie pas d'élargir l'exclusion.

**Ces exclusions sont explicites et limitées** : c'est la seule manière honnête d'avoir un seuil
qui veut dire quelque chose. Exclure un module métier pour atteindre un seuil serait une fraude et
est interdit par la Definition of Done.

---

## 7. Conventions

```text
tests/
├── unit/          miroir de src/, un fichier par module
├── integration/   par capacité métier
├── e2e/           par parcours, nommés E2E-xx
└── fixtures/
    ├── content/   contenus valides ET invalides
    └── builders/  fabriques d'objets (makeProject({ featured: true }))
```

- Nom de test = phrase qui décrit le comportement : `rejette un projet dont la technologie
  n'existe pas dans les compétences`.
- Structure Arranger / Agir / Assérer, sans commentaires superflus.
- Aucun `sleep` : horloges injectées côté unitaire, attentes web-first côté Playwright.
- Aucune dépendance entre tests, aucun ordre implicite.
- Un test instable est **corrigé ou supprimé**, jamais marqué `skip` durablement (un `skip` doit
  porter un lien vers une tâche de la roadmap).

---

## 8. Gates et CI

```text
make ci
 ├── lint              ESLint + Prettier --check + règles de cloisonnement
 ├── typecheck         tsc --noEmit
 ├── test              Vitest (unit + composants + intégration)
 ├── coverage          seuils ci-dessus
 ├── build             next build dans l'image
 ├── e2e               Playwright sur le build de production
 └── docker            construction de l'étage runner
```

Aucun gate n'est contournable sur une Pull Request. Un gate rouge = travail non terminé (§34 de la
mission, Definition of Done).

### Ce qui reste manuel, et assumé

- Lecture au lecteur d'écran (NVDA/VoiceOver) sur les parcours clés — Phase 12.
- Ressenti de fluidité de la scène sur matériel réel — Phases 8, 13.
- Vérification des contrastes sur la direction artistique finale — Phase 8.
- Restauration du VPS après incident — Phase 15.

Ces points figurent dans la checklist de release, pour qu'ils ne disparaissent pas faute d'être
automatisés.
</content>
