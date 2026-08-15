# Roadmap

> Statut global : **Phases 0, 1, 2 et 3 terminées et validées.** **Phase 4 ouverte le 2026-08-15**,
> dernière phase de la tranche T1. **P2-11 (rédaction du contenu réel) est DONE (2026-08-15)** : le
> contenu d'amorçage est entièrement remplacé, et le chemin critique de T1 est donc levé.
> Journal de la Phase 4 : [`phase-4-log.md`](./phase-4-log.md) — phases précédentes :
> [`phase-3-log.md`](./phase-3-log.md), [`phase-2-log.md`](./phase-2-log.md),
> [`phase-1-log.md`](./phase-1-log.md)
> Dernière mise à jour : 2026-08-15

Ce document est la **source de vérité unique des tâches**. Les identifiants sont stables et ne
sont jamais réutilisés, même si une tâche est abandonnée.

Statuts : `TODO` · `IN_PROGRESS` · `BLOCKED` · `DONE` · `DROPPED`

Une tâche n'est `DONE` que si elle satisfait la **Definition of Done** (§34 de la mission) :
implémentation terminée, code typé, tests pertinents ajoutés et verts, lint vert, zéro erreur
TypeScript, documentation à jour, critères d'acceptation satisfaits, aucune dette introduite
silencieusement.

---

## Vue d'ensemble des phases

| Phase | Nom | Statut | Livrable central |
|---|---|---|---|
| 0 | Discovery et cadrage | **DONE** | `docs/` complet, ADR 0001–0008 |
| 1 | Fondation technique | **DONE** *(2026-08-12)* | Squelette dockerisé, gates verts, CI, déploiement du squelette |
| 2 | Content layer | **DONE** *(2026-08-12)* | Markdown → objets typés validés, build cassé si invalide |
| 3 | Internationalisation | **DONE** *(2026-08-14)* | `/fr` et `/en` résolus indépendamment, hreflang exact |
| 4 | Portfolio HTML | **IN_PROGRESS** *(ouverte le 2026-08-15)* | **Produit utilisable sans Three.js** (phase obligatoire) |
| 5 | Fondation Three.js | TODO | Scène primitive : bureau + 3 écrans, budget tenu |
| 6 | Navigation spatiale | TODO | Route ↔ scène, testé sans WebGL |
| 7 | Interfaces des écrans | TODO | Contenu affiché sur les moniteurs, instance unique |
| 8 | Modélisation et direction artistique | TODO | Scène crédible, budgets mesurés à chaque ajout |
| 9 | Interactions secondaires | TODO | CV, GitHub, LinkedIn, contact, à propos |
| 10 | Envoi du CV | TODO | Server Action + fournisseur abstrait + anti-abus |
| 11 | Performance | TODO | Audit Avant/Après/Gain, budgets en CI |
| 12 | SEO et accessibilité | TODO | Audit complet, 0 violation serious/critical |
| 13 | Responsive et appareils limités | TODO | Paliers validés sur matériel réel |
| 14 | Hardening | TODO | Erreurs, sécurité, secrets, rate limit |
| 15 | Release | TODO | Mise en production VPS, checklist, rollback testé |

Dépendances fortes : 2 → 3 → 4 → 5 → 6 → 7. Les phases 8 et 9 supposent 7. La phase 10 est
indépendante de la 3D et peut être avancée si besoin. Les phases 11 à 14 sont des audits et
supposent un produit complet.

---

## Jalons de livraison

Décision du 2026-08-11 : pas d'échéance ferme, mais un objectif de **mise en ligne début
septembre 2026**. Le plan est donc découpé en trois tranches, et la mise en production est
**avancée à la fin de la Phase 4** au lieu de la Phase 15.

C'est possible sans dette technique précisément parce que l'ADR-0003 fait du portfolio documentaire
le socle et de la 3D un enrichissement : à la fin de la Phase 4, le produit est complet, indexable,
accessible et déployable. La 3D est ensuite livrée par incréments **sur un site déjà en ligne**.

| Tranche | Contenu | Cible | Résultat |
|---|---|---|---|
| **T1 — documentaire** | Phases 1 → 4, puis P4-13 à P4-15 | **début septembre 2026** | Portfolio complet en ligne, sans 3D |
| **T2 — immersion** | Phases 5 → 7, plus Phase 10 (CV) | ensuite, par incréments | Scène et navigation spatiale ajoutées en production |
| **T3 — finition** | Phases 8 → 9, puis 11 → 15 | au long cours | Direction artistique, audits, durcissement, release finale |

### Chemin critique de T1

```text
P1-17 domaine  ─┐
                ├─▶ P1-15 déploiement ─┐
VPS disponible ─┘                      ├─▶ P4-13 mise en production
                                       │
P1 → P2 → P3 → P4 ─────────────────────┤
                                       │
P2-11 rédaction du contenu réel ───────┘   ⚠ le plus sous-estimé
```

**Deux menaces réelles sur la date, et aucune n'est technique :**

1. ~~**La rédaction du contenu.**~~ **Levée le 2026-08-15** (P2-11) : 2 expériences, 1 projet et
   40 compétences par locale. Le volume de projets reste faible — un seul, ce portfolio — parce que
   le CV n'en cite aucun autre ; c'est un choix éditorial à rouvrir, pas une dette technique.
2. **Les prérequis externes** : achat du domaine (P1-17) et disponibilité du VPS. Ils bloquent la
   mise en ligne, pas le développement.

**Si le temps manque**, le levier est le **volume de contenu publié** (publier quatre projets
plutôt que douze, en ajouter ensuite), jamais les gates : un site incomplet mais correct se
complète ; un site rapide mais inaccessible ou non indexé est à refaire.

---

## PHASE 0 — Discovery et cadrage

**Objectif** — Comprendre le besoin, poser les contraintes, arrêter l'architecture, définir les
stratégies SEO / i18n / tests / performance, identifier les risques. Aucun code métier.

**Décisions prises** — ADR-0001 à ADR-0008 (voir [`adr/README.md`](./adr/README.md)).
Deux décisions ont été prises en cours de phase à la demande explicite : environnement dockerisé
(ADR-0007) et auto-hébergement VPS (ADR-0008), cette dernière remplaçant l'hypothèse H-01.

| ID | Tâche | Statut |
|---|---|---|
| P0-01 | Reformulation de la vision, personas, parcours utilisateurs | DONE |
| P0-02 | Contraintes fonctionnelles, techniques, exigences non fonctionnelles | DONE |
| P0-03 | Registre des risques et des hypothèses | DONE |
| P0-04 | Architecture candidate (couches, flux, arborescence, cloisonnement) | DONE |
| P0-05 | Stratégie SEO | DONE |
| P0-06 | Stratégie i18n | DONE |
| P0-07 | Stratégie de tests | DONE |
| P0-08 | Budget de performance | DONE |
| P0-09 | Stratégie d'enrichissement progressif et paliers de capacité | DONE |
| P0-10 | Rédaction des ADR 0001–0006 | DONE |
| P0-11 | ADR-0007 — environnement dockerisé | DONE |
| P0-12 | ADR-0008 — auto-hébergement VPS | DONE |
| P0-13 | Roadmap complète et tâches détaillées de la Phase 1 | DONE |

**Critères de sortie** — voir « Gate Phase 0 → Phase 1 » en fin de document.

---

## PHASE 1 — Fondation technique

**Objectif** — Un squelette dockerisé, typé, testé, vérifié en intégration continue et
**effectivement déployable**. Aucune fonctionnalité métier, aucune scène 3D.

**Décisions à prendre pendant la phase**

- Gestionnaire de paquets : **pnpm** proposé (installation rapide, lockfile strict, économe en
  disque dans une image). À confirmer en P1-03.
- Version de Node : LTS active, **pinnée par digest** dans le Dockerfile, répliquée dans `engines`
  et la CI. Vérifiée compatible avec la version de Next retenue.
- Version de Next.js : dernière version stable au moment de P1-03, **figée** par le lockfile. La
  compatibilité React / React Three Fiber sera revérifiée en P5-01 avant toute écriture de scène
  (risque R-08).

**Prérequis externes** (hors code, à ma charge)

- Docker fonctionnel sur l'hôte WSL2.
- Pour P1-15 : VPS accessible en SSH (H-01a).
- Pour P1-15 et P1-17 : **nom de domaine acheté**. Il conditionne le déploiement HTTPS, les URL
  canoniques et l'expédition du CV. À traiter tôt : c'est le prérequis externe le plus structurant
  et le moins réversible du projet.

### Tâches

**P1-01 — Initialiser le dépôt et les conventions**
Status: **DONE** (2026-08-11) · Depends on: —
Acceptance:
- Dépôt Git initialisé, branche par défaut définie, `.gitignore` couvrant `node_modules`, `.next`,
  `coverage`, `.env*`, artefacts Playwright.
- `.editorconfig` présent ; `.gitattributes` normalisant les fins de ligne (WSL2).
- `README.md` initial décrivant le démarrage **par Docker uniquement**.
- Aucun secret dans l'historique.

**P1-02 — Environnement Docker de développement** *(ADR-0007)*
Status: **DONE** (2026-08-11) — image construite, conteneur exécuté en `node` (1000:1000), volumes
nommés inscriptibles, étage `deps` prouvé constructible. Un défaut a été trouvé et corrigé :
points de montage créés en `root` par le démon, voir [`phase-1-log.md`](./phase-1-log.md) §3 bis.
`make up` est exercé en P1-03, faute d'application à démarrer avant. · Depends on: P1-01
Acceptance:
- `Dockerfile` avec les étages `base`, `deps`, `dev` ; version de Node pinnée en un point unique.
- `docker-compose.yml` : service `web`, bind mount du code, **volumes nommés** pour `node_modules`
  et `.next`, exécution avec l'UID/GID de l'hôte.
- `Makefile` : `up`, `down`, `install`, `sh`, au minimum.
- Aucun fichier appartenant à `root` n'apparaît dans le dépôt après utilisation.
- `docs/` mis à jour si l'implémentation diverge de l'ADR-0007.

**P1-03 — Initialiser Next.js dans le conteneur**
Status: **DONE** (2026-08-11) — Next 16.3.0 / React 19.2.8 démarrent via `make up` ; **hot reload
mesuré à 34–120 ms** (budget ~2 s) ; versions et choix de pnpm consignés au README. Un défaut a été
trouvé et corrigé : 355 Mo de store pnpm déversés sur l'hôte, voir
[`phase-1-log.md`](./phase-1-log.md) §3 ter. · Depends on: P1-02
Acceptance:
- Application Next.js (App Router, TypeScript) démarrant via `make up` sur `http://localhost:3000`.
- **Hot reload fonctionnel** : une modification est reflétée en moins de ~2 s, sans polling.
- Versions de Next, React et Node consignées dans le README.
- Choix du gestionnaire de paquets acté et justifié en une ligne dans le README.

**P1-04 — TypeScript strict**
Status: **DONE** (2026-08-11) — `make typecheck` vert, zéro erreur, aucune directive de suppression.
Les cinq options ont été **vues échouer** sur une sonde temporaire avant d'être déclarées actives
(voir [`phase-1-log.md`](./phase-1-log.md) §4 bis) ; `verbatimModuleSyntax` ajouté en complément.
· Depends on: P1-03
Acceptance:
- `strict: true`, plus `noUncheckedIndexedAccess`, `noImplicitOverride`,
  `exactOptionalPropertyTypes`, `noFallthroughCasesInSwitch`.
- `make typecheck` (`tsc --noEmit`) vert.
- Aucun `any` implicite ; aucune directive de suppression d'erreur dans le code initial.

**P1-05 — ESLint, Prettier et cloisonnement des couches**
Status: **DONE** (2026-08-11) — `make lint` vert (ESLint 9 + Prettier). Graphe de `architecture.md`
§1.2 encodé en `import/no-restricted-paths`, plus l'interdiction de React/Three.js dans
`src/content` et de Three.js dans `src/scene/state`. **7 violations volontaires vues échouer**, dont
2 que la première version de la règle laissait passer. Deux écarts documentés (`app → scene`,
`seo`) : voir [`phase-1-log.md`](./phase-1-log.md) §4 ter et §5 bis. · Depends on: P1-04
Acceptance:
- ESLint (config Next + TypeScript) et Prettier configurés, sans règles en conflit.
- Règle `import/no-restricted-paths` implémentant le graphe de dépendances de
  `architecture.md` §1.2 — notamment : `src/content/**` ne peut importer ni React ni Three.js,
  `src/scene/**` ne peut pas importer `src/content/**`.
- **Un test de la règle elle-même** : un import interdit ajouté volontairement fait échouer le lint
  (vérifié une fois, puis retiré). Une règle d'architecture non vérifiée est une intention, pas une
  contrainte.
- `make lint` vert.

**P1-06 — Structure des dossiers et alias**
Status: **DONE** (2026-08-11) — arborescence de `architecture.md` §8 créée, un `README.md` par
dossier (responsabilité + dépendances autorisées). Alias `@/*` vérifié résolu par **TypeScript**
(`make typecheck`), **ESLint** (détection des imports `@/…` en P1-05) et **Next** (sonde servie à
l'exécution, puis retirée). Vitest : à vérifier en P1-07. Les sous-dossiers vides de `tests/` n'ont
pas été créés — Git ne versionne pas les répertoires, ils ne survivraient pas à un clone ; P1-07 et
P1-08 les créent avec de vrais fichiers. · Depends on: P1-05
Acceptance:
- Arborescence de `architecture.md` §8 créée, avec un `README.md` d'une ligne par dossier
  expliquant sa responsabilité et ses dépendances autorisées.
- Alias `@/*` configuré et résolu à la fois par TypeScript, Next, Vitest et ESLint.
- Aucun dossier vide non justifié.

**P1-07 — Vitest, React Testing Library, couverture**
Status: **DONE** (2026-08-11) — deux projets Vitest (`node` et `components`/jsdom), RTL +
`jest-dom`, couverture V8 avec les seuils globaux **et** par module de `testing-strategy.md` §6,
exclusions explicites. `make test`, `make test-watch`, `make coverage` opérationnels dans le
conteneur. Le seuil a été **vu bloquer** (fonctions à 75 % < 80 %), corrigé par un test et non par
un abaissement. · Depends on: P1-06
Acceptance:
- Vitest configuré avec deux environnements : `node` (unitaires, intégration) et `jsdom`
  (composants).
- RTL et `@testing-library/jest-dom` opérationnels.
- Couverture V8 configurée avec les seuils globaux et par module de `testing-strategy.md` §6, y
  compris les exclusions explicites.
- `make test`, `make test:watch`, `make coverage` fonctionnels **dans le conteneur**.

**P1-08 — Playwright**
Status: **DONE** (2026-08-11) — service `e2e` séparé (image officielle `v1.62.1-noble`) ciblant
`http://web:3000`, démarrage synchronisé par un **healthcheck** sur `web`. Les cinq profils sont
déclarés et exécutables. Le script de neutralisation de WebGL est vérifié par un test qui constate
`getContext('webgl2') === null`, et **vu échouer** quand on désactive son injection. Artefacts dans
`test-results/` et `playwright-report/`, ignorés par Git, appartenant à l'hôte. `make e2e`
fonctionnel. · Depends on: P1-03
Acceptance:
- Service `e2e` distinct basé sur l'image officielle Playwright, ciblant `http://web:3000`.
- Projets configurés : `desktop-chromium`, `mobile-safari`, `no-webgl`, `no-js`, `reduced-motion`
  (`testing-strategy.md` §4.7). Les projets peuvent être vides de tests à ce stade, mais doivent
  être déclarés et exécutables.
- Le script d'initialisation neutralisant WebGL est écrit et **vérifié** (un test constate que
  `getContext('webgl2')` renvoie `null` dans ce projet).
- `make e2e` fonctionnel ; artefacts (traces, captures) écrits dans un dossier ignoré par Git.

**P1-09 — Page minimale et layout racine**
Status: **DONE** (2026-08-11) — page unique rendue par le serveur : `lang="fr"`, `h1` unique, `main`
identifié, lien d'évitement fonctionnel au clavier. Métadonnées `title`/`description`.
Réinitialisation CSS minimale, `:focus-visible` visible dès maintenant, `prefers-reduced-motion`
respecté dès la fondation. Aucune dépendance Three.js. · Depends on: P1-06
Acceptance:
- Une page unique, rendue par le serveur, avec HTML sémantique : `lang`, un `h1` unique, un `main`,
  un lien d'évitement.
- Aucune scène 3D, aucune dépendance Three.js dans le projet.
- Métadonnées de base (`title`, `description`).
- Réinitialisation CSS minimale ; style de focus visible défini dès maintenant.
- Note : le routage par locale arrive en Phase 3 ; cette page est temporaire et le sait.

**P1-10 — Premiers tests de fumée**
Status: **DONE** (2026-08-11) — 20 tests Vitest (unitaires sur `src/seo/site-url.ts`, composants sur
la page) et 16 E2E sur cinq profils : chargement + titre + zéro erreur console, lien d'évitement au
clavier, axe-core sans violation serious/critical, contenu présent sans JavaScript, WebGL neutralisé
vérifié. **Les dix assertions ont été vues échouer par mutation** ; deux d'entre elles ne testaient
rien au premier passage et ont été corrigées, ainsi qu'une branche de code morte qu'elles
révélaient (voir [`phase-1-log.md`](./phase-1-log.md) §4 quinquies).
· Depends on: P1-07, P1-08, P1-09
Acceptance:
- Un test unitaire réel (pas un `expect(true)`) sur une fonction utilitaire du projet.
- Un test de composant vérifiant le rendu de la page et la présence du `h1`.
- Un test E2E `desktop-chromium` : la page se charge, le titre est correct, aucune erreur console.
- Un test E2E `no-js` : le contenu est présent sans JavaScript.
- Un test axe-core : 0 violation serious/critical sur la page.
- **Chaque test a été vu échouer au moins une fois** (vérification qu'il teste réellement quelque
  chose).

**P1-11 — Interface de commandes et gate local**
Status: **DONE** (2026-08-11) — `make lint`, `typecheck`, `test`, `coverage`, `bundle`, `build`,
`e2e`, `e2e-prod`, et `make ci` qui enchaîne le tout. **`make ci` vert (code 0) depuis un `git clone` réel**,
volumes et images Docker préalablement détruits, aucun outil Node sur l'hôte, aucun fichier `root`
produit. Durée : ~56 s. Les E2E de `make ci` tournent contre l'**image
de production**, pas le serveur de développement (`testing-strategy.md` §8).
· Depends on: P1-05, P1-07, P1-08
Acceptance:
- Cibles `make lint`, `typecheck`, `test`, `coverage`, `build`, `e2e`, et `make ci` qui enchaîne le
  tout dans l'ordre de `testing-strategy.md` §8.
- `make ci` est **vert** depuis un clone neuf.
- Les commandes sont documentées dans le README, et ce sont les seules documentées (pas de
  variante `npm run` concurrente qui divergerait).

**P1-12 — Mesure et budget de bundle**
Status: **DONE** (2026-08-11) — `make bundle` mesure le JS réellement référencé par le HTML prérendu
de chaque route, en transfert gzip, et applique les seuils. Relevé : socle partagé **129,5 Ko** dont
**+3,5 Ko applicatifs**. Gate **vu échouer** (82 Ko de JS de route contre 40 Ko bloquants).
⚠ **Le budget « First Load JS partagé » a été révisé** : la valeur initiale (95/120 Ko) était
inférieure au plancher du framework, donc inatteignable. Justification écrite dans
`performance-budget.md` §4.1. · Depends on: P1-11
Acceptance:
- Analyse de bundle disponible en commande.
- Mesure initiale du First Load JS partagé consignée dans `performance-budget.md`.
- Assertion automatisée sur le seuil bloquant (120 Ko) : elle échoue si le seuil est franchi.
- Le mécanisme est en place même si la marge est confortable — il sert précisément à détecter la
  dérive future.

**P1-13 — Étages `build` et `runner`, image de production** *(ADR-0008)*
Status: **DONE** (2026-08-11) — `output: 'standalone'`, étages `build` et `runner`. L'image démarre
en **non-root** (`uid=1000(node)`), devient saine en ~6 s, sert la page en 4 ms, consomme **51 Mo**
de RSS au repos. Les 17 E2E passent **contre elle**. `deploy/Caddyfile` écrit et validé par Caddy.
⚠ Taille : **381 Mo**, au-dessus de la cible de 250 Mo, sous le seuil bloquant de 400 Mo — dont
340 Mo d'image de base, inévitables (analyse et décision en `performance-budget.md` §7.1).
· Depends on: P1-02, P1-03
Acceptance:
- `output: 'standalone'` activé ; étages `build` et `runner` dans le Dockerfile.
- Image de production exécutée **en non-root**, avec un `HEALTHCHECK`.
- L'image démarre et sert la page en local via `docker-compose.prod.yml`.
- Taille de l'image mesurée et consignée (budget : ≤ 250 Mo, seuil bloquant 400 Mo).
- `deploy/Caddyfile` écrit et validé localement (TLS interne ou domaine de test).

**P1-14 — Intégration continue**
Status: **DONE** (2026-08-11) — workflow `.github/workflows/ci.yml` écrit et valide : trois jobs
(`versions` → `gates` → `e2e`), version de Node **extraite du Dockerfile** et de pnpm de
`package.json` (aucune recopie), cache pnpm et navigateurs Playwright, E2E contre l'image de
production, couverture et rapport Playwright publiés en artefacts.
**Vérifié le 2026-08-11**, dans cet ordre :
1. **CI verte sur `main`** — `versions` 4 s, gates 41 s, image de production + E2E 4 min 51.
2. **Protection de branche active, `bypass_actors` vide.** Un push direct sur `main` est refusé
   (`GH013 — Changes must be made through a pull request`), y compris pour le propriétaire.
3. **PR fautive vue échouer**, et pour la bonne raison : `'react' import is restricted … (CT-09)`.
   La fusion a été **tentée avec `--admin`** et refusée : *« Required status check … is failing »*.
   `main` n'a pas bougé. PR fermée, branche supprimée.

Un défaut réel a été trouvé par la CI, invisible en local : `storeDir` portait un chemin absolu de
conteneur (`/app/…`) alors que les gates s'exécutent nativement sur le runner. Corrigé en relatif. · Depends on: P1-11, P1-13
Acceptance:
- Workflow GitHub Actions : `install → lint → typecheck → test → coverage → build → e2e`, plus un
  job de construction de l'étage `runner`.
- Version de Node identique à celle du Dockerfile (source unique).
- Dépendances et navigateurs Playwright mis en cache.
- **Aucun gate contournable** sur une Pull Request ; protection de branche activée.
- Rapport de couverture publié comme artefact.
- Une PR volontairement fautive est **vue échouer** avant de considérer la tâche terminée.

**P1-15 — Déploiement du squelette sur le VPS** *(walking skeleton)*
Status: **DONE** (2026-08-11) — le site est en ligne sur <https://aurelienfeignon.com>, servi par
l'image `ghcr.io/aurelienfeignon/portfolio:<sha>` derrière Caddy. VPS Hetzner CX23 à Nuremberg
(Debian 13, 2 vCPU / 3,7 Gio), provisionné et durci : `root` refusé en SSH, mot de passe refusé,
`ufw` fermé par défaut, `unattended-upgrades` actif, Docker installé depuis le dépôt officiel — le
tout **vérifié après un redémarrage réel**, confirmé par le changement de `boot_id` et non par
`uptime`, qui lit encore une machine en cours d'extinction comme debout.
La chaîne complète a tourné trois fois : gates → E2E contre l'image → publication GHCR taguée par
SHA → SSH vers le VPS. La clé de déploiement est enregistrée avec
`command="/srv/portfolio/deploy.sh"` et ne donne pas de shell (`cat /etc/shadow` → `commande
refusée`). **Rollback exécuté pour de vrai** : retour d'un commit au précédent en 9 s, 26 sondes
HTTPS à 0,5 s pendant l'opération, aucun échec observé — puis remise à niveau par le même chemin.
Procédure d'exploitation dans [`deploy/README.md`](../deploy/README.md), écrite après exécution.
⚠ Deux points hors périmètre restent ouverts : le proxy Cloudflare est encore en *DNS only* (le CDN
de H-01b n'est donc pas actif), et DMARC n'est pas publié.
· Depends on: P1-13, P1-14, **P1-17**
Acceptance:
- VPS provisionné : pare-feu fermé par défaut, SSH par clé sans mot de passe ni accès root,
  mises à jour de sécurité automatiques, Docker installé.
- Publication de l'image sur GHCR, taguée par SHA de commit.
- Déploiement déclenché par la CI ; le VPS ne construit rien.
- Caddy sert le site en HTTPS avec certificat valide, sur le domaine cible.
- **Rollback exécuté au moins une fois** vers le tag précédent, avec succès.
- `deploy/README.md` : provisionnement, déploiement, rollback, consultation des journaux.
- Aucun secret dans le dépôt ; fichier d'environnement en `600` sur le VPS.

> Si le VPS ou le domaine ne sont pas disponibles, P1-15 passe en `BLOCKED` et n'empêche pas la
> sortie de Phase 1 — à condition que P1-13 et P1-14 soient `DONE`, c'est-à-dire que l'image de
> production soit construite et vérifiée en CI. Le déploiement réel devient alors la première
> tâche de la Phase 2. Ce report est le seul autorisé, et il est tracé ici.

**P1-17 — Nom de domaine et zone DNS** *(prérequis transverse — à engager en premier)*
Status: **DONE** (2026-08-12) — `make check-dns` vert sur tous les points vérifiables, jugés sur
**deux résolveurs indépendants** : apex et `www` servis par Cloudflare, `AAAA` synthétisée, un seul
`SPF` incluant Mailjet, `DKIM` publié, `DMARC` en `p=none` avec une adresse de rapport **dans le
domaine** (une adresse externe n'aurait produit aucun rapport), et des `MX` pour que cette adresse
soit joignable. Domaine `aurelienfeignon.com` chez Namecheap, expirant le 2027-08-11, renouvellement
automatique vérifié au whois ; domaine `Active` chez Mailjet le 2026-08-12.
· Depends on: — · Bloque : P1-15, P3-06, P10-11
Acceptance:
- Domaine acheté, registraire et date d'expiration consignés ; **renouvellement automatique
  activé** (une expiration de domaine coupe simultanément le site, le HTTPS et l'expédition).
- ~~Enregistrements `A`/`AAAA` pointant le VPS.~~ **Reformulé le 2026-08-12** : l'apex et `www` sont
  servis par **Cloudflare**, et ne doivent surtout plus exposer l'IP d'origine — celle-ci n'accepte
  d'ailleurs plus que les plages Cloudflare (`deploy/README.md` §6.3). `make check-dns` vérifie
  désormais l'appartenance à ces plages, à la même source que le pare-feu de l'origine.
- Authentification Mailjet du domaine : `SPF` et `DKIM` publiés, expéditeur validé.
- **`DMARC` publié**, en observation (`p=none`) au départ, avec adresse de rapport.
- Identité d'expédition alignée sur le domaine du portfolio (ou l'un de ses sous-domaines), pour
  que DMARC soit satisfait.
- Un seul enregistrement `SPF` sur la zone (les enregistrements multiples invalident la
  vérification — erreur classique quand on ajoute un fournisseur à une zone existante).
- Domaine retenu inscrit dans la configuration comme **valeur unique** (variable d'environnement),
  jamais recopié en dur dans les métadonnées, le sitemap ou l'expéditeur.

**P1-16 — Documentation de fondation**
Status: **DONE** (2026-08-11) — README complet (prérequis, démarrage, commandes, structure,
décisions) ; `architecture.md` §1.2 et §2.3 mis à jour avec mention explicite des changements ;
`performance-budget.md` §4.1 et §7.1 pour les deux budgets confrontés à la mesure ; ADR-0007 amendé
et journal des révisions à jour ; bilan de phase rédigé dans [`phase-1-log.md`](./phase-1-log.md)
§7. · Depends on: toutes les précédentes
Acceptance:
- README : prérequis (Docker seul), démarrage, commandes, structure, où lire les décisions.
- `docs/architecture.md` mis à jour si l'implémentation a divergé (avec mention explicite du
  changement, jamais de correction silencieuse).
- Roadmap mise à jour : statuts, écarts, décisions prises en cours de phase.
- Bilan de Phase 1 rédigé : ce qui a été fait, ce qui a dérivé, ce qui est reporté.

### Tests de la Phase 1

Unitaires : une fonction utilitaire réelle. Composants : rendu de la page minimale.
E2E : chargement, absence de JS, axe-core. Infrastructure : `make ci` vert depuis un clone neuf,
image de production démarrant et répondant au healthcheck.

### Critères de sortie de la Phase 1

État au 2026-08-11 — détail et mesures dans [`phase-1-log.md`](./phase-1-log.md) §7.

- [x] `make ci` vert depuis un **clone neuf**, sans aucun outil Node sur l'hôte — *vérifié sur un
      `git clone` réel, volumes et images détruits au préalable : code 0, aucun fichier `root`.*
- [x] Hot reload fonctionnel en moins de ~2 s — **34 à 120 ms**.
- [x] `make e2e` vert, tous projets déclarés exécutables — 17 tests, 5 profils.
- [x] Aucun fichier `root` produit dans le dépôt.
- [x] TypeScript strict, zéro erreur, aucune suppression d'erreur.
- [x] Règle de cloisonnement active et **vérifiée par un échec observé**.
- [x] **CI verte, gates non contournables, échec observé sur une PR fautive** — *fusion refusée même
      avec `--admin` ; le dépôt est passé en public pour débloquer Actions (voir Q5).*
- [x] Image de production construite, non-root, démarrant avec healthcheck.
- [x] Budget de bundle mesuré et automatiquement surveillé — gate vu échouer.
- [x] P1-17 : domaine, `A`/`AAAA`, `SPF`, `DKIM`, `DMARC` et `MX` — `make check-dns` vert sur deux
      résolveurs ; domaine `Active` chez Mailjet.
- [x] P1-15 : **déployé et en ligne** sur <https://aurelienfeignon.com>, rollback exécuté.
- [x] Aucune dépendance Three.js présente dans le projet.

> **Tous les critères de sortie sont satisfaits, chacun vérifié par une exécution.** La Phase 1 est
> close.
>
> Deux réserves consignées plutôt que passées sous silence : le CPU du conteneur n'a été relevé
> qu'une minute après démarrage (32 %, au-dessus du seuil d'alerte de 25 %) et n'a donc pas été
> mesuré en régime stable — c'est l'objet de P11-08 ; et la procédure de restauration du serveur
> reste à écrire sous la contrainte du risque R-23, l'hébergeur ne garantissant pas la création
> d'une machine neuve à la demande.

---

## PHASE 2 — Content layer

**Objectif** — Transformer les fichiers Markdown/MDX en objets typés et validés, sans aucune
dépendance à React ni à Three.js. Un contenu invalide casse le build.

| ID | Tâche | Statut | Dépend de |
|---|---|---|---|
| P2-01 | ADR-0009 : choix de la bibliothèque MDX (compatibilité vérifiée) | **DONE** *(2026-08-12)* | P1-16 |
| P2-02 | Schémas Zod `Project`, `Experience`, `Skill` + types dérivés | **DONE** *(2026-08-12)* | P2-01 |
| P2-03 | Lecture du système de fichiers, parsing du frontmatter, cache par requête | **DONE** *(2026-08-12)* | P2-02 |
| P2-04 | Validation stricte : erreur nommant le fichier fautif, échec du build | **DONE** *(2026-08-12)* | P2-03 |
| P2-05 | Repositories typés (`getAll*`, `get*BySlug`, `getContentLocales`) | **DONE** *(2026-08-12)* | P2-03 |
| P2-06 | Normalisations et dérivations (tri, dates, poste en cours, `featured`) | **DONE** *(2026-08-12)* | P2-05 |
| P2-07 | Vérification de cohérence référentielle `technologies` ↔ `Skill.slug` | **DONE** *(2026-08-12)* | P2-05 |
| P2-08 | Compilation MDX en RSC avec liste blanche de composants | **DONE** *(2026-08-12)* | P2-01 |
| P2-09 | Fixtures valides **et invalides** + fabriques d'objets de test | **DONE** *(2026-08-12)* | P2-02 |
| P2-10 | Contenu réel d'amorçage : 2 expériences, 2 projets, 5 compétences (fr + en) | **DONE** *(2026-08-12)* | P2-06 |
| P2-11 | **Rédaction du contenu réel complet (fr + en)** | **DONE** *(2026-08-15)* | P2-06 |

**P2-01 — ADR-0009, choix de la bibliothèque MDX**
Status: **DONE** (2026-08-12) — `@mdx-js/mdx` appelé directement, `next-mdx-remote` désigné comme
repli. Les deux candidats applicables ont été **construits et servis**, pas comparés sur leur
documentation : build Turbopack de production, route prérendue statiquement, **0,0 Ko** de
JavaScript client, rendu vérifié depuis l'**image de production**, et compilateur tracé dans
`.next/standalone`. Les erreurs ont été comparées sur trois cas fautifs. Deux constats consignés
dans [`phase-2-log.md`](./phase-2-log.md) §6 : la compilation a lieu **au build** (toutes les pages
sont SSG), et **MDX exécute du JavaScript** — `content/` est donc du code.
· Depends on: P1-16

**P2-02 — Schémas Zod et types dérivés**
Status: **DONE** (2026-08-12) — trois schémas `strictObject` (une clé inconnue est une erreur, pas
un champ ignoré), types dérivés par `z.infer`, table type → schéma exhaustive par construction.
Zod 4.4.3, **zéro dépendance ajoutée à l'arbre**. 63 tests ; **neuf mutations appliquées au code de
production, les neuf tuées** ([`phase-2-log.md`](./phase-2-log.md) §8).
⚠ **Écart tracé** : `content → i18n` a été **ajouté au graphe de dépendances** — `architecture.md`
§1.2 (`content → rien`) contredisait §3.3 (API typée par locale). Justification, options pesées et
échecs observés en [`phase-2-log.md`](./phase-2-log.md) §7. Les interdictions React / Next /
Three.js de CT-09 sont inchangées et revérifiées. · Depends on: P2-01

**P2-03 — Lecture, frontmatter, mémoïsation**
Status: **DONE** (2026-08-12) — chargeur en fabrique (`createContentSource(racine)`), donc testable
sur des fixtures sans variable d'environnement ni mutation globale. 31 tests, **couverture 100 %** ;
**huit mutations appliquées, les huit tuées** ([`phase-2-log.md`](./phase-2-log.md) §9).
⚠ **Deux étapes du pipeline de `architecture.md` §3.2 ont changé**, chacune après vérification par
exécution : `gray-matter` → `yaml` (le premier transforme `2024-01-15` en objet `Date`, ce que nos
schémas rejettent), et cache React → mémoïsation à la durée du processus (la couche Content ne peut
pas importer React, CT-09). · Depends on: P2-02

**P2-04 — Validation stricte, et le build vu casser**
Status: **DONE** (2026-08-12) — gate `scripts/check-content.mts` branché **avant** `next build`.
Motif : en Phase 2 aucune page ne lit le contenu, et même en Phase 4 seules les entités rendues
seraient validées — CF-10 serait resté une intention. Le gate valide **tout** `content/`, dans la CI
comme dans la construction de l'image.
**Prouvé par exécution** : un `content/fr/projects/augure.mdx` fautif écrit exprès a fait échouer
`make build`, avec un message nommant le fichier et **les quatre défauts en une seule passe**
([`phase-2-log.md`](./phase-2-log.md) §10). Automatisé ensuite : `tests/integration/content-gate.test.ts`
exécute le gate en sous-processus et constate son code de sortie sur cinq familles de fautes.
Quatre mutations appliquées, les quatre tuées. Couverture `src/content/**` : **100 %**.
⚠ Trois conséquences assumées, toutes vérifiées : extensions `.ts` explicites dans les imports de
`src/content/**` (Node ESM), plus de propriété de paramètre dans `ContentError`, et `"type": "module"`
ajouté à `package.json`. Le socle de bundle est inchangé (129,5 Ko).
⚠ Réserve : un gate qui ne trouve **aucun** fichier sort en 0 aujourd'hui — à rendre bloquant en
P2-10, une fois le contenu d'amorçage écrit. · Depends on: P2-03

**P2-05 et P2-06 — API de lecture, tris et dérivations**
Status: **DONE** (2026-08-12) — dépôt en fabrique, `get*BySlug` rendant `null` (une route inconnue
n'est pas une erreur, `architecture.md` §10), `getContentLocales` ne citant que les locales
réellement présentes (base du traitement de R-07). Tris et dérivations appliqués **dans la couche**,
une fois pour tous les consommateurs : sans horloge, sans conversion en `Date`, avec le slug comme
départage pour un ordre stable d'un build à l'autre. 34 tests, couverture 100 %, **neuf mutations
appliquées et tuées** ([`phase-2-log.md`](./phase-2-log.md) §11).
Deux niveaux de types introduits — `*Entry` (ce que le chargeur produit) et `Project` /
`Experience` / `Skill` (dérivations appliquées) — sans quoi `isOngoing` devrait exister avant
d'être calculé. · Depends on: P2-03, P2-05

**P2-07 — Cohérence référentielle**
Status: **DONE** (2026-08-12) — détection en fonction pure, branchée sur le gate de P2-04 : une
technologie inconnue **casse le build**, en nommant le fichier et toutes les références mortes en une
passe. La cohérence est jugée **à l'intérieur d'une locale** — un projet anglais citant `typescript`
a besoin de `en/skills/typescript.md`. Ce choix a trouvé un défaut dans nos propres fixtures dès son
activation. 7 tests, trois mutations appliquées et tuées
([`phase-2-log.md`](./phase-2-log.md) §12). · Depends on: P2-05

**P2-08 — Compilation MDX et liste blanche**
Status: **DONE** (2026-08-12) — rendu dans `src/ui/mdx/`, jamais dans `src/content` (CT-09). La
liste blanche **refuse avant de rendre** : un greffon remark relève les composants appelés pendant
la compilation, ce qui produit une erreur nommant le fichier **et** le composant, au lieu du message
de React au milieu du rendu de la page. 13 tests, couverture 100 %, six mutations appliquées et
tuées. La liste ne contient qu'un composant (`Callout`, sémantique et sans style) : les ajouts
appartiennent à la Phase 4, avec l'ADR-0010.
⚠ Rappel consigné : cette liste **n'est pas une mesure de sécurité** — MDX exécute du JavaScript
sans passer par un composant (§6.1). À reprendre tel quel en Phase 14.
📏 Image de production **381 Mo**, inchangée depuis la Phase 1 : le runtime MDX n'y est pas, aucune
route ne compilant encore de corps. Les ~7 Mo mesurés en P2-01 reviendront en Phase 4
([`phase-2-log.md`](./phase-2-log.md) §13). · Depends on: P2-01

**P2-09 — Fixtures et fabriques**
Status: **DONE** (2026-08-12) — deux jeux de fabriques qui ne se remplacent pas : `frontmatter.ts`
(du YAML lu sur disque, donc `Record<string, unknown>` — les typer interdirait d'écrire les cas
invalides) et `entities.ts` (ce que rend le dépôt). Sept racines de fixtures invalides, une par
famille de faute.
**Indépendance prouvée** : la suite complète a été exécutée avec `content/` **entièrement déplacé
hors du dépôt** — 201 tests verts, couverture 100 %. Un garde-fou permanent refuse désormais toute
mention du dépôt de l'application dans `tests/**`
([`phase-2-log.md`](./phase-2-log.md) §14). · Depends on: P2-02

**P2-10 — Contenu d'amorçage**
Status: **DONE** (2026-08-12) — 18 fichiers (2 expériences, 2 projets, 5 compétences par locale),
chacun portant en clair la mention « à remplacer en P2-11 ». Il couvre volontairement les cas que le
code doit traiter : poste en cours, projet terminé, `featured` et non-`featured`, les cinq
catégories, un corps avec composant, un lien de dépôt.
**Le gate a immédiatement trouvé une faute réelle** : `summary: Ce site : un portfolio…` — un `:`
suivi d'une espace dans une valeur non entre guillemets, que YAML lit comme une table imbriquée. Elle
touchait les deux locales et serait passée inaperçue (page absente, sans erreur). Règle écrite dans
`content/README.md`.
Le cas « aucun contenu trouvé » est **désormais bloquant**, comme annoncé
([`phase-2-log.md`](./phase-2-log.md) §15). · Depends on: P2-06

**P2-11 — contenu réel**
Status: **DONE** (2026-08-15) — le contenu d'amorçage est **entièrement remplacé**. Par locale :
2 expériences, 1 projet, 40 compétences en cinq catégories dont dix `featured`. Écrit à partir des
deux versions du CV, après que trois questions bloquantes ont été tranchées — Askor est une
expérience chez **EVEA Conseil**, Augure est le projet propre de l'utilisateur (propriétaire, PO et
unique développeur, société non constituée), et les deux sont **en cours**.
⚠️ Deux réserves, écrites dans `content/README.md` : les **dates de début** sont au 1ᵉʳ janvier faute
de mois dans le CV, et les **niveaux** de compétence sont une proposition à relire.
⚠️ Un test E2E codait `/fr/projects/augure` en dur et a cassé, Augure étant devenu une expérience.
Corrigé à la bonne profondeur : le test **déduit du sitemap** une entité traduite dans les deux
langues, au lieu d'en nommer une. Un E2E qui nomme une entité teste le contenu du jour.

**Critères de sortie** — État au 2026-08-12, détail et mesures dans
[`phase-2-log.md`](./phase-2-log.md).

- [x] Couverture ≥ 95 % sur `src/content/**` — **100 %** sur les quatre métriques, et sur
      `src/ui/mdx/**` et `src/i18n/**` également.
- [x] Un frontmatter invalide fait échouer `make build`, **prouvé par un test** — vu échouer à la
      main sur un fichier écrit exprès (§10.2), puis automatisé : le gate est exécuté en
      sous-processus contre six familles de fautes, et son code de sortie est celui du build.
- [x] Aucun import React ou Three.js dans la couche, **vérifié par le lint** — règle revérifiée par
      échec observé après la modification du graphe (§7).
- [x] Fixtures indépendantes du contenu réel — **suite complète verte avec `content/` déplacé hors
      du dépôt**, plus un garde-fou permanent (§14).

> **Tous les critères de sortie sont satisfaits, chacun vérifié par une exécution.** La Phase 2 est
> close. Trois réserves consignées plutôt que passées sous silence : la liste blanche MDX **n'est pas
> une mesure de sécurité** (§6.1, à reprendre en Phase 14) ; le runtime MDX n'entrera dans l'image de
> production qu'avec la première page qui rend un corps, ce qui rapprochera du seuil de 400 Mo (§13.3) ;
> et `content/` n'étant pas dans l'image, **aucune route ne devra pouvoir se rendre à la demande**
> (§9.4, à vérifier avant P4-13).

---

## PHASE 3 — Internationalisation

**Objectif** — `/fr/...` et `/en/...` résolus **indépendamment**, avec des métadonnées, un
`hreflang` et un sitemap qui ne mentent jamais sur ce qui existe réellement. Journal de phase :
[`phase-3-log.md`](./phase-3-log.md).

| ID | Tâche | Statut | Dépend de |
|---|---|---|---|
| P3-01 | Type `Locale`, liste des locales, locale par défaut — **partiellement livré en P2-02**. À **compléter**, jamais à recréer | **DONE** *(2026-08-14)* | P2-05 |
| P3-02 | Segment `app/[locale]` + `generateStaticParams` ; locale inconnue → 404 | **DONE** *(2026-08-14)* | P3-01 |
| P3-03 | Négociation `Accept-Language` sur `/` avec repli | **DONE** *(2026-08-14)* | P3-01 |
| P3-04 | Dictionnaires d'interface typés, complétude garantie à la compilation | **DONE** *(2026-08-14)* | P3-01 |
| P3-05 | Table `routeSegments` (identité en v1) et constructeurs d'URL | **DONE** *(2026-08-14)* | P3-02 |
| P3-06 | `generateMetadata` : title, description, canonical | **DONE** *(2026-08-14)* | P3-02 |
| P3-07 | `hreflang` dérivé des locales réellement existantes + `x-default` | **DONE** *(2026-08-14)* | P3-06, P2-05 |
| P3-08 | `sitemap.xml` et `robots.txt` générés depuis le Content Layer | **DONE** *(2026-08-14)* | P3-07 |
| P3-09 | Sélecteur de langue préservant l'entité courante ; cas sans traduction | **DONE** *(2026-08-14)* | P3-05 |

**P3-01 — vocabulaire des locales**
Status: **DONE** (2026-08-14) — `LOCALE_NAMES` (endonymes) ajouté, et rien d'autre : le reste
existait depuis P2-02. **`parseLocale` n'a pas été créé** : `isLocale` rend le même service sous la
forme dont les appelants ont besoin — une garde de type. Les comportements exigés par
`testing-strategy.md` §4.2 sont tous testés ([`phase-3-log.md`](./phase-3-log.md) §8).

**P3-05 — segments et constructeurs d'URL**
Status: **DONE** (2026-08-14) — écrit **avant** P3-02 : quatre consommateurs en dépendent (segment de
route, métadonnées, sitemap, sélecteur de langue). Table `routeSegments` à l'identité, conservée
comme point unique du changement (ADR-0005). Une mutation survit **par construction** —
`segmentFor` ignorant la locale est indétectable tant que la table est l'identité — et c'est
consigné plutôt que masqué par un test artificiel.

**P3-04 — dictionnaires d'interface**
Status: **DONE** (2026-08-14) — complétude tenue par le compilateur, **vue échouer dans les deux
sens** (clé manquante `TS2741`, clé en trop `TS2353`). Écrit avant P3-02 et non après P3-03 comme
prévu : le lien d'évitement est un libellé, et il vit dans le layout.

**P3-02 — segment `[locale]`, et la dette de la Phase 2 qui devient réelle**
Status: **DONE** (2026-08-14) — `src/app/layout.tsx` et `src/app/page.tsx` **supprimés** : le layout
racine est `app/[locale]/layout.tsx`, ce qui permet à `<html lang>` de porter la langue réelle
(dette 1 de `phase-1-log.md` §7.4, levée). `dynamicParams = false` **plus un gate** :
`scripts/check-static-rendering.mts` lit les manifestes de build et exige que chaque route soit
prégénérée ou close ; il est branché sur `pnpm build`, donc son code de sortie est celui du build.
**Vu échouer** sur quatre routes en retirant la déclaration du layout.
⚠️ Trois obstacles rencontrés et consignés ([`phase-3-log.md`](./phase-3-log.md) §10.1) : un échec de
prérendu qui n'était qu'un `NODE_ENV=development`, la signature imposée de `generateStaticParams`, et
la convention `middleware` **dépréciée par Next 16.3** au profit de `proxy`.

**P3-03 — négociation de `/`**
Status: **DONE** (2026-08-14) — `src/proxy.ts`, 307 et `Vary: Accept-Language`. Un test a trouvé une
**erreur de raisonnement** sur le joker `*` : le premier jet répondait `fr` à `fr;q=0.1,*;q=0.9`, là
où la RFC 9110 §12.5.4 impose `en`. Corrigé en raisonnant par locale disponible et non par
préférence ([`phase-3-log.md`](./phase-3-log.md) §11.1).

**P3-06 et P3-07 — métadonnées et `hreflang`**
Status: **DONE** (2026-08-14) — une seule fonction produit `title`, `description`, `canonical` et
`hreflang` ; le sitemap et le sélecteur de langue lisent **la même** source d'alternatives, ce qui
les rend incapables de se contredire (R-07).
⚠️ **`SITE_URL` devient un argument de construction** : les pages étant statiques, les URL sont
gravées au build. L'image n'est plus neutre vis-à-vis du domaine — [ADR-0008](./adr/0008-self-hosted-vps-deployment.md)
amendé, journal des révisions à jour.
✅ **Contrainte `seo → i18n, routing` confirmée** (elle était posée par défaut depuis P1-05), et
**`app → seo` ajoutée** : §1.2 de `architecture.md` l'omettait alors que §9 l'exige — même famille
d'omission que `app → scene` en Phase 1.

**P3-08 — sitemap et robots**
Status: **DONE** (2026-08-14) — une entrée par **page réellement servie**, union des slugs de toutes
les locales, alternatives dérivées de la même source que le `hreflang`. `robots.txt` **n'interdit
pas** `/resume/` : le bloquer empêcherait le robot de lire le `X-Robots-Tag: noindex` qui, lui, fait
le travail.

**P3-09 — sélecteur de langue**
Status: **DONE** (2026-08-14) — propose **toujours** les deux langues, en pointant vers la page
existante la plus proche quand la traduction manque, et en le disant (`aria-describedby`). R-07 vise
ce qu'on annonce à un moteur de recherche, pas ce qu'on offre à un visiteur.

**Critères de sortie** — État au 2026-08-14, détail et mesures dans
[`phase-3-log.md`](./phase-3-log.md) §17.

- [x] `/fr/projects/augure` et `/en/projects/augure` résolus **indépendamment**, prouvé par test —
      intégration sur fixtures **et** E2E contre l'image de production.
- [x] Aucun `hreflang` vers une page inexistante — unitaires, **et** un E2E qui suit réellement
      chaque lien alternatif de chaque page du sitemap.
- [x] Sitemap exact — **et** aucune de ses URL ne renvoie autre chose que 200.
- [x] Couverture ≥ 95 % sur `i18n` et `routing` — **100 %** sur les quatre métriques, et 100 % au
      global.
- [x] *(hérité de la Phase 2)* Aucune route ne se rend à la demande — gate **vu échouer**.

> **Tous les critères de sortie sont satisfaits, chacun vérifié par une exécution.** La Phase 3 est
> close. 436 tests, `make ci` vert, 17 mutations appliquées et toutes tuées.
>
> Quatre réserves consignées plutôt que passées sous silence : `SITE_URL` a désormais **deux
> sources** en production (`ENV` de l'image et `env_file` de Compose), à vérifier en P4-13 ; les
> `dynamicParams = false` des pages de détail sont **inertes**, la valeur du parent étant héritée ;
> l'image passe à **385 Mo** pour un seuil bloquant à 400, alors que la Phase 4 y ajoutera ~7 Mo de
> runtime MDX ; et `content/` étant parfaitement symétrique, le cas « entité non traduite » n'existe
> que dans les fixtures tant que P2-11 n'a pas produit la sienne.

---

## PHASE 4 — Portfolio HTML *(obligatoire)*

**Objectif** — Un portfolio complet et utilisable **sans Three.js**. C'est le socle de tout le
reste et le filet de sécurité permanent du projet. Journal de phase :
[`phase-4-log.md`](./phase-4-log.md).

| ID | Tâche | Statut | Dépend de |
|---|---|---|---|
| P4-01 | ADR-0010 : stratégie de style | **DONE** *(2026-08-15)* | P3-09 |
| P4-02 | Layout documentaire : en-tête, navigation, pied de page, lien d'évitement | TODO | P4-01 |
| P4-03 | Accueil : présentation et accès aux trois sections | TODO | P4-02 |
| P4-04 | Liste et détail des expériences | TODO | P4-02 |
| P4-05 | Liste et détail des projets — **première page qui rend un corps MDX** | TODO | P4-02 |
| P4-06 | Compétences (groupées par catégorie) | TODO | P4-02 |
| P4-07 | Pages 404 et erreur, localisées | TODO | P4-02 |
| P4-08 | Métadonnées OpenGraph et images de partage | TODO | P3-06 |
| P4-09 | JSON-LD : `Person`, `WebSite`, `CreativeWork`, `BreadcrumbList` | TODO | P4-05 |
| P4-10 | Passe accessibilité : titres, focus, contrastes, points de repère | TODO | P4-06 |
| P4-11 | Responsive documentaire : mobile, tablette, desktop | TODO | P4-06 |
| P4-12 | E2E : navigation complète, deep links, bascule de langue, clavier | TODO | P4-11 |
| P4-13 | **Mise en production du portfolio documentaire** *(jalon T1)* | TODO | P4-12, P1-15, P2-11 |
| P4-14 | Supervision : healthcheck conteneur + sonde externe avec alerte (risque R-15) | TODO | P4-13 |
| P4-15 | Checklist de mise en ligne + rollback vérifié en conditions réelles | TODO | P4-13 |
| P4-16 | Vérification post-déploiement : indexation, canonical, hreflang, sitemap accessibles publiquement — **suppose de lever Cloudflare Access**, qui ferme le site au public depuis le 2026-08-15 (`deploy/README.md` §4.2) | TODO | P4-13 |

**P4-01 — ADR-0010, stratégie de style**
Status: **DONE** (2026-08-15) — **CSS Modules + tokens en variables CSS**, décidé sur une exécution
et non sur une comparaison de documentations : une sonde construite par `make bundle` mesure **0,0 Ko
de JavaScript ajouté** sur les 16 routes, un socle **inchangé à 129,5 Ko**, des classes réellement
cloisonnées (`style-probe-module__e50QiW__probe`), une feuille servie en fichier statique immuable —
et **aucun paquet ajouté au verrou**, les CSS Modules étant déjà dans Next.
Deux alternatives écartées avec leur déclencheur de réexamen : Tailwind (dépendance structurante au
sens de CT-08, et balisage plus difficile à relire à l'audit de P4-10 — à rouvrir si la Phase 8 amène
une direction artistique dense), vanilla-extract (compatibilité Turbopack dépendante d'un greffon
tiers). Le mode de panne des CSS Modules est consigné dans l'ADR plutôt que passé sous silence : une
classe mal orthographiée rend `undefined` **sans erreur**. · Depends on: P3-09

**Critères de sortie** — Toutes les exigences de la §20 de la mission satisfaites ; Lighthouse
mobile ≥ 85 / a11y 100 / SEO 100 ; 0 violation axe serious/critical ; le projet `no-js` passe ;
**aucune dépendance Three.js dans le dépôt à ce stade** ; **site en ligne, supervisé, avec un
rollback prouvé**.

> P4-13 à P4-16 constituent le jalon **T1**. Ce sont des mises en production anticipées : la
> Phase 15 reste la release du produit complet et **réutilisera la checklist établie en P4-15**
> plutôt que d'en créer une seconde.

---

## PHASE 5 — Fondation Three.js

| ID | Tâche | Dépend de |
|---|---|---|
| P5-01 | Vérification de la matrice de compatibilité React / R3F / drei (risque R-08) | P4-12 |
| P5-02 | Installation justifiée de `three`, `@react-three/fiber`, `@react-three/drei` | P5-01 |
| P5-03 | `resolveCapabilityTier` (fonction pure) + adaptateur navigateur | P5-02 |
| P5-04 | Montage du canvas : dynamique, `ssr:false`, après idle, `aria-hidden` | P5-03 |
| P5-05 | Scène primitive : bureau + trois écrans en géométries de base | P5-04 |
| P5-06 | Caméra, éclairage, environnement minimal | P5-05 |
| P5-07 | Error boundary du canvas + gestion de `webglcontextlost` → palier `none` | P5-04 |
| P5-08 | Panneau de diagnostic : FPS, draw calls, triangles, mémoire | P5-06 |
| P5-09 | Test de non-régression : aucun module `three` dans les chunks initiaux | P5-04 |
| P5-10 | Boucle de rendu à la demande, pause hors écran / onglet masqué | P5-06 |

**Critères de sortie** — Chunk 3D ≤ 320 Ko et absent du chemin critique (prouvé) ; Core Web Vitals
de la Phase 4 **non dégradés** ; désactiver WebGL laisse le site intact ; budgets de la scène
primitive mesurés et consignés.

---

## PHASE 6 — Navigation spatiale

| ID | Tâche | Dépend de |
|---|---|---|
| P6-01 | `resolveSceneState(pathname)` — pur, sans Three.js | P5-05 |
| P6-02 | `getCameraTarget(state)` — positions cibles par écran | P6-01 |
| P6-03 | `getRouteForScreen(screen, locale)` + propriété d'aller-retour | P6-01 |
| P6-04 | Transition de caméra pilotée par la route, interruptible | P6-02 |
| P6-05 | Écrans interactifs : survol, focus, activation → `router.push` | P6-03 |
| P6-06 | Équivalents DOM accessibles de chaque interaction (CF-06) | P6-05 |
| P6-07 | `data-scene-focus` exposé au DOM pour l'observabilité et les tests | P6-04 |
| P6-08 | Respect de `reduced-motion` : coupes instantanées | P6-04 |
| P6-09 | ADR-0012 : stratégie d'animation de caméra | P6-04 |
| P6-10 | E2E : back/forward, deep link, clavier, reduced-motion | P6-08 |

**Critères de sortie** — Couverture ≥ 95 % sur `src/scene/state/**`, **zéro import Three.js** dans
ce dossier ; back/forward et deep links corrects ; mapping écran ↔ section exhaustif et testé.

---

## PHASE 7 — Interfaces des écrans

| ID | Tâche | Dépend de |
|---|---|---|
| P7-01 | Conteneur superposé et projection des positions d'écran | P6-04 |
| P7-02 | Mécanisme de portail à instance unique (ADR-0004) | P7-01 |
| P7-03 | Branchement des contenus Projets / Expériences / Compétences | P7-02, P2-05 |
| P7-04 | Test d'intégration de non-duplication du contenu dans le DOM (R-01) | P7-03 |
| P7-05 | Ordre de tabulation et focus cohérents en mode immersif | P7-03 |
| P7-06 | Comportement lors des transitions (masquage/révélation du panneau) | P7-03 |
| P7-07 | Bascule de locale et deep links en mode immersif | P7-03 |
| P7-08 | Repli « panneau fixe » si le positionnement projeté est instable | P7-01 |

**Critères de sortie** — Chaque contenu présent **une seule fois** dans le DOM ; texte natif,
sélectionnable, lu correctement ; deep link et bascule de langue corrects en immersif ; aucune
régression des Core Web Vitals.

---

## PHASE 8 — Modélisation et direction artistique

| ID | Tâche | Dépend de |
|---|---|---|
| P8-01 | ADR-0011 : provenance, licences et pipeline des assets 3D | P7-07 |
| P8-02 | Chaîne de compression (Draco/Meshopt, KTX2) et chargement | P8-01 |
| P8-03 | Bureau et écrans définitifs | P8-02 |
| P8-04 | Ordinateur, clavier, souris | P8-03 |
| P8-05 | Éclairage et ambiance | P8-04 |
| P8-06 | Objets de décor porteurs de sens (support des interactions de la Phase 9) | P8-05 |
| P8-07 | Mesure `Avant / Après / Gain` **après chaque ajout** (P8-03 à P8-06) | P8-03 |
| P8-08 | Vérification des contrastes sur la direction artistique finale | P8-05 |

**Critères de sortie** — Budgets de `performance-budget.md` §5 tenus ; journal de mesures complet ;
aucun objet ajouté sans justification d'usage ; contrastes conformes.

---

## PHASE 9 — Interactions secondaires

| ID | Tâche | Dépend de |
|---|---|---|
| P9-01 | Cadre d'interaction générique (objet ↔ action ↔ équivalent DOM) | P8-06 |
| P9-02 | CV : document sur le bureau → page contact | P9-01 |
| P9-03 | GitHub : terminal → lien externe | P9-01 |
| P9-04 | LinkedIn : téléphone → lien externe | P9-01 |
| P9-05 | À propos : cadre → `/[locale]/about` | P9-01 |
| P9-06 | Affordances : survol, curseur, focus visible sur les objets | P9-01 |
| P9-07 | E2E clavier sur l'ensemble des interactions | P9-06 |

**Critères de sortie** — Chaque interaction 3D a un équivalent DOM focusable et activable ; aucune
information n'existe uniquement dans la scène.

---

## PHASE 10 — Envoi du CV

| ID | Tâche | Dépend de |
|---|---|---|
| P10-01 | Interfaces `ResumeSender` et `RateLimiter` | P4-02 |
| P10-02 | `FakeResumeSender` et `ConsoleResumeSender` | P10-01 |
| P10-03 | Schéma de validation Zod + honeypot + time-trap | P10-01 |
| P10-04 | Rate limiter en mémoire, horloge injectée, fenêtre glissante | P10-01 |
| P10-05 | Plafond global journalier persisté sur volume | P10-04 |
| P10-06 | Server Action + formulaire fonctionnant **sans JavaScript** | P10-03 |
| P10-07 | `MailjetResumeSender` (API Send v3.1, `fetch` natif, délai d'expiration) + validation des variables d'environnement | P10-02 |
| P10-08 | Téléchargement direct du PDF en complément — **les deux PDF existent depuis le 2026-08-12** (`public/resume/cv-{fr,en}.pdf`, `noindex` posé et vérifié en E2E) ; reste le lien et son libellé | P10-06 |
| P10-09 | Garde-fou : la suite échoue si des identifiants Mailjet de production sont présents | P10-07 |
| P10-10 | E2E : succès, adresse invalide, panne serveur, rate limit, sans JS | P10-06 |
| P10-11 | **Vérification des prérequis d'expédition** : authentification du domaine effective (SPF, DKIM, DMARC en place depuis P1-17), expéditeur validé, quota du plan connu (H-02c) | P1-17 |
| ~~P10-12~~ | ~~Service Mailpit + test d'intégration SMTP~~ — **DROPPED** : sans objet depuis l'abandon du transport SMTP. Remplacé par P10-16. | — |
| P10-13 | Identité d'expédition dédiée au portfolio, cloisonnée d'Augure — sous-compte si possible (H-02b, R-20) | P10-11 |
| P10-14 | Consultation du tableau de bord des rejets ; vérification de réception réelle | P10-13 |
| P10-15 | Message de confirmation invitant à vérifier le dossier « indésirables » | P10-06 |
| P10-16 | Test de l'adaptateur sur le contenu réel de la requête (`fetch` injecté) : destinataire, expéditeur, sujet et corps fixes, pièce jointe base64 | P10-07 |
| P10-17 | Plafond journalier calibré **sous** le quota du plan, coupure propre à l'atteinte (R-20) | P10-05, P10-11 |
| P10-18 | Mention du traitement de l'adresse par le fournisseur, sur la page de contact (R-21) | P10-06 |

**Critères de sortie** — Couverture ≥ 95 % sur `features/resume` ; aucun e-mail réel envoyé par les
tests, et aucun chemin de code capable de joindre le réseau depuis la suite ; corps du message
prouvé invariant vis-à-vis de l'entrée utilisateur ; formulaire fonctionnel sans JavaScript ;
prérequis H-02a et H-02c **vérifiés et consignés**, pas supposés ; plafond journalier sous le
quota ; un CV de test reçu et lisible dans au moins deux messageries grand public ; **aucune
dépendance ajoutée au projet**.

> P10-11 est sans dépendance interne et **conditionne toute la phase** : si le domaine du portfolio
> n'est pas authentifié chez le fournisseur, ce n'est pas du code qui corrigera l'envoi. À traiter
> en premier.

---

## PHASE 11 — Performance

| ID | Tâche |
|---|---|
| P11-01 | Mesure de référence complète (`Avant`) : bundles, assets, Vitals, FPS |
| P11-02 | Analyse des bundles et découpage |
| P11-03 | Optimisation des modèles et textures |
| P11-04 | Optimisation de la boucle de rendu et des allocations |
| P11-05 | Mesure du TTFB **depuis au moins deux régions** (risque R-16) |
| P11-06 | Décision et mise en place éventuelle du CDN en frontal (H-01b) |
| P11-07 | En-têtes de cache et immuabilité des assets côté Caddy |
| P11-08 | Mesure de la consommation du conteneur sur le VPS (`performance-budget.md` §7) |
| P11-09 | Budgets de performance en gate CI |
| P11-10 | Rapport `Avant / Après / Gain` |

**Critères de sortie** — Tous les budgets tenus ou dépassements arbitrés explicitement par
réduction de l'ambition (jamais par relèvement de seuil non justifié) ; budgets surveillés en CI.

---

## PHASE 12 — SEO et accessibilité

| ID | Tâche |
|---|---|
| P12-01 | Audit métadonnées, canonical, hreflang, sitemap, robots |
| P12-02 | Validation des données structurées |
| P12-03 | Audit Lighthouse desktop et mobile |
| P12-04 | Audit axe sur toutes les pages types |
| P12-05 | Parcours clavier complet, y compris en mode immersif |
| P12-06 | **Test manuel au lecteur d'écran** (NVDA/VoiceOver) |
| P12-07 | Vérification de `reduced-motion` et des paliers de repli |
| P12-08 | Vérification : le HTML sans JavaScript contient tout le texte utile |
| P12-09 | ADR-0013 : régression visuelle, adopter ou non |
| P12-10 | Correction de tous les problèmes avant passage à la suite |

**Critères de sortie** — a11y 100 et SEO 100 sur toutes les pages types ; 0 violation
serious/critical ; audit manuel au lecteur d'écran effectué et consigné.

---

## PHASE 13 — Responsive et appareils limités

| ID | Tâche |
|---|---|
| P13-01 | Validation des quatre paliers sur **matériel réel** |
| P13-02 | Expérience mobile de la scène (palier `lite`) finalisée |
| P13-03 | Comportement en mémoire contrainte et sur GPU faible |
| P13-04 | Vérification `save-data` et connexions lentes |
| P13-05 | Ajustement de la complexité de la scène par palier |
| P13-06 | E2E sur profils tablette et mobile |

**Critères de sortie** — Aucune expérience lente livrée : une dégradation contrôlée est préférée ;
utilisabilité mobile jamais sacrifiée au concept desktop (risque R-05).

---

## PHASE 14 — Hardening

| ID | Tâche |
|---|---|
| P14-01 | Revue de la gestion des erreurs : contenu inexistant, locale invalide, assets |
| P14-02 | Erreurs Three.js : perte de contexte, échec de chargement, mémoire |
| P14-03 | Indisponibilité du fournisseur e-mail, rate limit, réponses neutres |
| P14-04 | En-têtes de sécurité HTTP et **ADR-0015 : politique CSP définitive** |
| P14-05 | Audit de la sécurité du VPS : SSH, pare-feu, secrets, non-root (risque R-17) |
| P14-06 | Validation des variables d'environnement au démarrage |
| P14-07 | Tests de régression sur tous les cas d'erreur ci-dessus |
| P14-08 | Audit de l'expédition : cloisonnement vis-à-vis d'Augure, plafond journalier effectif sous le quota, secrets d'API non exposés (risque R-20) |

**Critères de sortie** — Aucun chemin d'erreur non traité ; aucune fuite d'information ; audit VPS
consigné.

---

## PHASE 15 — Release

| ID | Tâche |
|---|---|
| P15-01 | Exécution de la suite complète : lint, typecheck, unit, composants, intégration, E2E, build, Lighthouse, audit a11y |
| P15-02 | Checklist de release écrite |
| P15-03 | Supervision : healthcheck + sonde externe avec alerte (risque R-15) |
| P15-04 | Nettoyage périodique des images Docker et rotation des journaux |
| P15-05 | **Procédure de restauration écrite et testée** |
| P15-06 | Rollback testé une nouvelle fois sur la version de production |
| P15-07 | Mise en production et vérification post-déploiement |
| P15-08 | Bilan de projet et dette technique connue, tracée |
| P15-09 | Vérification de délivrabilité en production : envoi réel reçu et lisible, rejets consultés (risque R-19) |

**Critères de sortie** — Aucun problème critique ignoré silencieusement ; supervision active ;
restauration et rollback prouvés, pas seulement documentés.

---

## Gate Phase 0 → Phase 1

Le passage en Phase 1 est autorisé lorsque **tous** les points suivants sont validés en revue.

**Complétude des livrables**

- [ ] `docs/vision.md`, `architecture.md`, `testing-strategy.md`, `performance-budget.md`,
      `roadmap.md` produits.
- [ ] ADR 0001 à 0008 rédigés au format `Contexte / Décision / Alternatives / Conséquences`.
- [ ] ADR restants **identifiés** avec leur phase de décision et ce qui manque pour trancher.

**Cohérence de l'architecture**

- [ ] Les deux couches sont distinctes et leurs responsabilités ne se recouvrent pas.
- [ ] Le principe « une information métier n'est jamais définie deux fois » est mis en œuvre par un
      mécanisme concret (instance unique + portail), pas seulement affirmé.
- [ ] Le cloisonnement des dépendances est **vérifiable automatiquement**, pas seulement documenté.
- [ ] La logique de scène est conçue pour être testable sans WebGL.

**Stratégies validées**

- [ ] SEO : chaque page de contenu est du HTML serveur ; le contenu existe sans le canvas.
- [ ] i18n : routes, contenu, métadonnées, hreflang, sitemap ; règle de repli explicite.
- [ ] Tests : pyramide, outillage, ce qui est testé et ce qui ne l'est pas, seuils de couverture.
- [ ] Enrichissement progressif : quatre paliers définis et testables.
- [ ] Performance : budgets chiffrés et méthode de mesure.

**Décisions et risques**

- [ ] Les risques principaux sont documentés, cotés, et chacun a une mitigation rattachée à une
      phase.
- [ ] Les hypothèses ouvertes sont listées explicitement (§7 de `vision.md`) et **acceptées ou
      corrigées** par la revue.
- [ ] Aucune décision structurante n'a été prise implicitement.

**Validation attendue de ma part** *(seule action requise pour débloquer la Phase 1)*

- [ ] Hypothèses encore ouvertes confirmées ou corrigées : H-01a/b/c (VPS, CDN, déploiement),
      **H-02b (sous-compte Mailjet ou plafond seul — dernier point ouvert sur R-20)**,
      H-02c (quota du plan), H-03 à H-06, H-08 à H-10.
      *(Tranchées : H-01 → ADR-0008 ; H-02 → ADR-0006 ; H-02a et H-07 → P1-17.)*
- [ ] Ordre d'arbitrage validé : **a11y > indexabilité > performance du contenu > richesse 3D**.
- [ ] Découpage en phases et périmètre de la Phase 1 approuvés.
</content>
