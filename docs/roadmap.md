# Roadmap

> Statut global : **Phases 0 à 4 terminées et validées. PHASE 4 CLOSE — 17 tâches sur 17, jalon T1
> atteint** : le portfolio documentaire est en production, supervisé, avec une checklist de mise en
> ligne, un rollback rejoué et une vérification **depuis l'extérieur** (14 URL, `canonical`,
> `hreflang` et `lang` concordants, Lighthouse contre le site réel — a11y 100, SEO 100, bonnes
> pratiques 100).
> **PHASE 5 ENGAGÉE** : P5-01 close, matrice R3F vérifiée **par exécution**, verdict **GO** sous deux
> contraintes. ⚠️ Une décision attend l'exploitant — la cible du chunk 3D est **sous le plancher
> mesuré** (`performance-budget.md` §4.3, décision **D9**). Suite : **P5-02**, l'installation.
> Journal : [`phase-5-log.md`](./phase-5-log.md).
> Journal de la Phase 4 : [`phase-4-log.md`](./phase-4-log.md) — phases précédentes :
> [`phase-3-log.md`](./phase-3-log.md), [`phase-2-log.md`](./phase-2-log.md),
> [`phase-1-log.md`](./phase-1-log.md)
> Dernière mise à jour : 2026-08-20 (Phase 4 close, Phase 5 engagée)

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
| 4 | Portfolio HTML | **DONE** *(2026-08-20)* | **Produit utilisable sans Three.js** (phase obligatoire) |
| 5 | Fondation Three.js | **IN_PROGRESS** *(ouverte le 2026-08-20)* | Scène primitive : bureau + 3 écrans, budget tenu |
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
⛔⛔ **Amendé le 2026-08-18 (P4-15) : cette mesure de disponibilité est périmée, sans avoir jamais
été fausse.** Elle a été prise proxy Cloudflare en *DNS only* — la réserve écrite deux lignes plus
bas —, donc une 200 venait bien de l'origine. Depuis la bascule en *Full (strict)* du 2026-08-12,
Cloudflare compose la réponse à sa périphérie : le même geste rendrait aujourd'hui 26 verts sur un
site mort. Le rejeu jugé sur le corps observe **~1 s d'indisponibilité de l'origine**
(`deploy/README.md` §4.3). Le rollback, lui, fonctionne — c'est sa *preuve d'innocuité* qui a changé
de sens.
Procédure d'exploitation dans [`deploy/README.md`](../deploy/README.md), écrite après exécution.
⚠ Deux points hors périmètre étaient ouverts à la clôture : le proxy Cloudflare en *DNS only* (le
CDN de H-01b inactif) et DMARC non publié. ✅ **Le premier est levé depuis le 2026-08-12** — proxy en
*Full (strict)*, CDN actif (`deploy/README.md` §5) —, et c'est précisément cette bascule qui a périmé
la mesure de disponibilité ci-dessus. **DMARC reste à publier.**
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
| P4-02 | Layout documentaire : en-tête, navigation, pied de page, lien d'évitement | **DONE** *(2026-08-15)* | P4-01 |
| P4-03 | Accueil : présentation et accès aux trois sections | **DONE** *(2026-08-15)* | P4-02 |
| P4-04 | Liste et détail des expériences | **DONE** *(2026-08-16)* | P4-02 |
| P4-05 | Liste et détail des projets — **première page qui rend un corps MDX** | **DONE** *(2026-08-16)* | P4-02 |
| P4-06 | Compétences (groupées par catégorie) | **DONE** *(2026-08-16)* | P4-02 |
| P4-07 | Pages 404 et erreur, localisées | **DONE** *(2026-08-16)* | P4-02 |
| P4-08 | Métadonnées OpenGraph, gabarit de titre, images de partage et icône | **DONE** *(2026-08-16)* | P3-06 |
| P4-09 | JSON-LD : `Person`, `WebSite`, `CreativeWork`, `BreadcrumbList` | **DONE** *(2026-08-16)* | P4-05 |
| P4-10 | Passe accessibilité : titres, focus, contrastes, points de repère, les cinq fichiers non couverts, le garde des endroits piloté par l'arborescence, et `experimental.globalNotFound` comme plancher | **DONE** *(2026-08-16)* | P4-06 |
| P4-11 | Responsive documentaire : mobile, tablette, desktop | **DONE** *(2026-08-16)* | P4-06 |
| P4-12 | E2E : navigation complète, deep links, bascule de langue, clavier | **DONE** *(2026-08-16)* | P4-11 |
| P4-13 | **Mise en production du portfolio documentaire** *(jalon T1)* | **DONE** *(2026-08-17)* | P4-12, P1-15, P2-11 |
| P4-14 | Supervision : healthcheck conteneur + sonde externe avec alerte (risque R-15) | **DONE** *(2026-08-17)* | P4-13 |
| P4-15 | Checklist de mise en ligne + rollback vérifié en conditions réelles | **DONE** *(2026-08-18)* | P4-13 |
| P4-17 | **Précision variable des dates** — préalable de P4-09, levé | **DONE** *(2026-08-16)* | P4-04 |
| P4-16 | Vérification post-déploiement : indexation, canonical, hreflang, sitemap accessibles publiquement | **DONE** *(2026-08-20)* | P4-13 |

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

**P4-02 — Layout documentaire**
Status: **DONE** (2026-08-15) — en-tête (marque + navigation), pied de page, lien d'évitement, et la
première application de l'ADR-0010 : trois `*.module.css`, tous les littéraux remontés en tokens dans
`globals.css`. **2,7 Ko de CSS** en deux fichiers statiques immuables, **0,0 Ko de JavaScript** sur
les 16 routes, socle **inchangé à 129,5 Ko**.
Trois points reportés de la Phase 3 sont levés. **(1)** `aria-current="page"` sur la section active :
le layout racine ne peut pas la connaître — l'App Router ne la lui donne pas, et `headers()`
rendrait la route dynamique, ce que le gate de rendu statique refuse. Ce sont donc **quatre layouts**,
un par endroit, qui déclarent chacun le leur ; l'accueil a reçu un groupe de routes `(home)` pour être
sur le même plan que les trois sections plutôt que de rendre son en-tête lui-même. **(2)** L'identité
de marque devient **« Aurélien Feignon »** : nom propre, donc identique dans les deux locales —
l'exception que tolérait déjà le test de non-régression des dictionnaires devient structurelle au lieu
d'être fortuite. **(3)** La navigation client est **tranchée par la mesure** et reste en balises
`<a>` : `next/link` n'a pas été introduit, et c'est ce qui garde les 0,0 Ko.
Décidé au passage, plutôt que subi : **pas de lien « Accueil » dans la navigation**, c'est la marque
qui y mène — la clé `nav.home` ne revient donc pas, et les technologies d'assistance n'annoncent pas
deux fois la même cible.
⚠️ `aria-current` vaut **`true`** et non `page` sur les liens de section : le layout couvre aussi les
pages de détail, où `page` annoncerait « page courante » sur un lien qui mène ailleurs. `page` reste
sur la marque, à l'accueil, où le lien désigne bien la page affichée.
⭐ L'accord « un endroit ⇒ un layout » est gardé par un test **exhaustif tenu par le compilateur**
(`Record<CurrentPlace, …>`) qui **appelle** chaque layout et lit la valeur transmise — sans quoi une
quatrième section aurait sa route, son lien et son entrée au sitemap, mais aucun en-tête, tous gates
verts. Neuf défauts trouvés par `/code-review` puis `/simplify` sur un travail déjà vert
(`phase-4-log.md` §7.5). · Depends on: P4-01

**P4-03 — Accueil**
Status: **DONE** (2026-08-15) — identité, phrase de situation, et accès aux trois sections par un
`SectionGuide` qui **dit ce que chaque section contient** au lieu de la nommer. C'est ce qui le
distingue de la navigation de l'en-tête et ce qui justifie de doubler la cible ; il n'est
délibérément **pas** un second point de repère `navigation`, sa structure étant portée par des titres
de niveau 2 — le plan du document, que les lecteurs d'écran parcourent aussi.
⛔ **Aucun texte de présentation n'a été écrit.** Une prose sur le parcours d'Aurélien est du contenu
éditorial (CF-09, ADR-0001) : en inventer aurait mis des affirmations sur quelqu'un dans un
dictionnaire d'interface, sans rien pour les distinguer d'un libellé. La page affiche
`site.description`, qui existe et est traduite ; le vrai texte d'accroche est une **décision
éditoriale ouverte** (`phase-4-log.md` §8). · Depends on: P4-02

**P4-04 — Liste et détail des expériences**
Status: **DONE** (2026-08-16) — `ExperienceList` (poste titré et lié, employeur, lieu quand il est
connu, période, « en cours » visible **sans ouvrir la fiche**) et la fiche complète : réalisations et
pile technique, dont les slugs sont résolus en libellés par le référentiel des compétences.
⭐⭐ **La décision 4 est tranchée : la précision d'affichage est l'ANNÉE**, et ce n'est pas
cosmétique. Le CV source ne donne que des années, le schéma exige un jour, et `content/` porte donc
des 1ᵉʳ janvier d'attente (décision D1, ouverte) : « janvier 2021 » afficherait comme un fait un mois
que personne ne connaît. ⛔ Conséquence qui va plus loin que l'affichage — **`datetime` porte la même
précision que ce qui est montré** : `<time datetime="2021-01-01">` affirmerait ce jour à un moteur de
recherche et au JSON-LD de P4-09.
⛔⛔ **Mais ce qui est livré est la troncature, pas la règle** — la revue l'a établi. `year()` est
inconditionnelle : elle efface aussi la précision **connue** du projet « portfolio », et elle ne
protège que cette vue (P4-09 lira l'entité et réémettra la date complète, rien ne l'en empêche). Le
correctif au bon niveau — `isoDateSchema` acceptant `AAAA` / `AAAA-MM` / `AAAA-MM-JJ`, l'incertitude
voyageant **avec** la donnée — est inscrit comme **préalable de P4-09** (`phase-4-log.md` §9.6) et
touche le schéma de contenu : la décision appartient à l'utilisateur.
⭐ `page.module.css` extrait au **deuxième** exemplaire, avant que P4-05 et P4-06 n'en fassent un
quatrième et un cinquième. · Depends on: P4-02

**P4-17 — Précision variable des dates**
Status: **DONE** (2026-08-16) — `isoDateSchema` accepte `AAAA`, `AAAA-MM` **ou** `AAAA-MM-JJ`, soit
exactement le domaine de `<time datetime>` pour une date calendaire. Ce qui est stocké est donc
**émissible verbatim, juste par construction** — la propriété que P4-09 exigeait et que la troncature
de P4-04 ne pouvait pas tenir.
⚠️ **Renversement assumé d'une décision de P2-02**, qui n'acceptait que le jour et qualifiait la
précision d'affichage de « décision de rendu, pas de stockage ». La prémisse était fausse sur le point
qui compte : `datetime` et le JSON-LD ne sont pas du rendu, ce sont des **émissions de données**.
`content/` porte désormais `2021` pour Askor (mois inconnu) et garde `2026-08-11` pour le portfolio
(jour connu) ; le HTML servi rend `<time dateTime="2021">2021</time>` d'un côté et
`<time dateTime="2026-08-11">11 août 2026</time>` de l'autre.
⛔ **Le tri comparait des chaînes de longueurs différentes par `localeCompare`**, qui traite le tiret
comme de la ponctuation — un poids dépendant d'une collation qu'aucun test ne contrôle. Les dates se
comparent maintenant par unités de code, comme le faisait déjà `isPeriodOrdered`, et quatre cas
croisant les trois précisions le gardent.
⭐ En YAML, `2021` nu est un **entier** : les valeurs à l'année sont donc quotées dans `content/`.
· Depends on: P4-04

**P4-06 — Compétences groupées par catégorie**
Status: **DONE** (2026-08-16) — cinq groupes titrés, chacun rattaché à sa liste par `aria-labelledby`,
dans l'**ordre du domaine** (du plus concret au plus transversal). Le groupement est une dérivation et
vit donc dans la couche Content (`groupByCategory`) : il **rétablit** l'ordre au lieu de supposer
l'entrée triée, et n'ouvre pas une catégorie que rien ne remplit.
⛔ **Les niveaux (1 à 5) ne sont pas affichés**, et c'est délibéré : `content/README.md` les donne pour
« une proposition […] un jugement sur toi-même : relis-les » — décision **D2, ouverte**. Les publier
afficherait comme un fait une auto-évaluation que personne n'a validée, c'est-à-dire exactement
l'erreur que la précision des dates a coûté une tâche entière à réparer. Ils **ordonnent** la liste ;
ils ne l'**affirment** pas. Un parcours E2E garde la décision.
⭐ Seconde exception au test de non-régression des dictionnaires : `skills.categories.infrastructure`
est le mot juste dans les deux langues. La règle reste de chercher **d'abord** la formulation
idiomatique — « Frameworks » est devenu « Frameworks et bibliothèques » / « Frameworks & libraries »,
qui décrit mieux une catégorie contenant aussi des bibliothèques. · Depends on: P4-02

**P4-07 — Pages 404 et erreur, localisées**
Status: **DONE** (2026-08-16) — toute URL inconnue est **réécrite** par le proxy vers une vraie page
prérendue et localisée, avec le statut porté par la réécriture (une réécriture rend 200 par défaut).
Trois sondes ont établi qu'aucune voie ordinaire n'existe : le layout racine vivant sous `[locale]`,
la 404 interne de Next est servie **hors de tout layout**, donc sans `<html lang>` — une violation
WCAG 3.1.1 que le gate axe n'avait jamais vue, faute d'un parcours sur une 404.
⭐⭐ Le proxy a besoin de la liste des chemins servis **avant** `next build`, alors que les pages en
sont le produit : deux énumérations impossibles à fusionner. `check-static-rendering.mts` les
confronte après coup **aux pages réellement prégénérées** — et non au sitemap, qui est une seconde
dérivée : comparer deux dérivées accuse celle qui n'a pas tort. Les deux sens sont vus échouer.
⛔⛔⛔ **Le matcher a été faux deux fois.** Il énumérait d'abord ses exceptions à la main et ignorait
`resume/` : **les deux CV répondaient 404** alors qu'ils sont en ligne depuis la Phase 2 (trouvé par
le parcours E2E). Le premier correctif — « un chemin de page ne contient jamais de point » — était
faux dans l'autre sens : `/wp-login.php` et `/cv.pdf`, qui n'existent pas, recevaient la 404 interne
de Next, **sans `lang`** (trouvé par `/code-review`, confirmé par la mesure). Les deux versions ont
la même racine : décider d'après la **forme** d'une URL ce que seul le disque sait. La décision
quitte le matcher pour la fonction, sur des listes **générées** — dont celle de `public/`, lue sur
le disque — et deux gates de plus les confrontent au build.
⛔⛔ **Et la page introuvable était servie sans en-tête**, étant un cinquième « endroit » qu'aucun
layout ne déclarait ; élargir `CurrentPlace` a rendu la ligne du garde obligatoire à la compilation.
⛔ **Les frontières d'erreur coûtent le premier JavaScript applicatif du site** : 0,0 → **7,2 Ko par
route**, socle 129,5 → 126,0, soit **133,2 Ko** à la première visite pour une cible de 136. Mesuré
avant d'être décidé, y compris les variantes écartées (`phase-4-log.md` §13.5). Le profil `no-js`
reste vert — vrai par vérification, non plus par construction. · Depends on: P4-02

**P4-08 — Gabarit de titre, OpenGraph, image de partage et icône**
Status: **DONE** (2026-08-16) — `%s — Aurélien Feignon` déclaré **une fois**, au layout racine ;
l'accueil y échappe par **déduction de l'emplacement**, et non par une déclaration que chaque page
pourrait oublier. Le séparateur est une clé de dictionnaire, et les deux langues diffèrent
réellement (tiret cadratin / barre verticale) — formulation idiomatique cherchée avant l'exception.
⛔⛔ **L'image de partage était générée, prégénérée et invisible** : Next ne l'attache que tant que
la page ne déclare pas d'`openGraph`, et chaque page en déclare un — il remplace alors celui du
parent, image comprise. Un parcours suit désormais l'`og:image` **jusqu'à la réponse** : annoncer
une adresse ne prouve pas qu'elle répond.
⭐⭐⭐ **Le gate de P4-07 a travaillé pour cette tâche sans qu'on le lui demande**, deux fois : il a
refusé l'image tant qu'elle se rendait **à la demande** (un PNG de 1200×630 par requête sur un VPS à
2 vCPU), puis tant que le proxy l'aurait réécrite en 404.
⚠️ L'icône est un **monogramme d'attente**, dérivé des initiales de `site.name` et dit comme tel :
un logo est une décision de marque. Elle existe pour une raison mesurée — 14,5 Ko de page 404 à
chaque requête d'icône. L'effet est **partiel** : une requête nue sur `/favicon.ico` reste une 404,
et la fermer demanderait une copie figée de l'icône (`phase-4-log.md` §14.4).
⛔⛔⛔ **La revue a trouvé une URL `localhost` gravée dans les pages 404** : faute de
`metadataBase`, Next résolvait les URL de métadonnée contre son hôte de développement, et il
**l'écrivait au build** sans que personne ne lise sa sortie — la leçon de la Phase 3, repayée. Un
parcours refuse désormais toute origine étrangère sur **toutes** les pages servies.
📏 Image de production **272 Mo** (+4 Mo, le coût de `next/og`, entièrement de build, aucune
dépendance ajoutée au verrou) ; socle 126,4 Ko ; 569 tests, 117 E2E. · Depends on: P3-06

**P4-11 — Responsive documentaire**
Status: **DONE** (2026-08-16) — débordement, cibles tactiles et rognage mesurés sur **16 pages ×
5 largeurs** (320 à 1440), plus un parcours sur le moteur mobile réel.
⭐⭐⭐ **Première tâche de la phase sans garde derrière elle** : un débordement ne lève rien et
n'apparaît dans aucun rapport axe. Elle a donc commencé par **mesurer**.
⛔⛔ **Deux défauts réels, en production** : le sélecteur de langue n'avait **aucun module CSS** — son
lien faisait la hauteur d'une ligne sur les 16 pages, en place depuis P3-09 et passé à travers une
passe d'accessibilité complète, axe ne rapportant pas WCAG 2.5.8 —, et le lien « retour à l'accueil »
était nu dans **trois** fichiers.
⭐ `tap-target.module.css` annonçait dès P4-03 que P4-11 vérifierait les cibles et que « qu'elles
viennent toutes d'ici est ce qui rend cette vérification tenable ». Deux fichiers à corriger au lieu
de six.
⭐ **Aucune media query de largeur n'a été nécessaire** : la mise en page fluide de l'ADR-0010 tenait
déjà. Ce que la tâche apporte est la **preuve**.
📏 Socle, JS par route et image inchangés. 627 tests, 140 E2E, couverture 100 %.
· Depends on: P4-06

**P4-10 — Passe accessibilité**
Status: **DONE** (2026-08-16) — audit axe, plan des titres, points de repère et noms accessibles sur
**les 16 pages servies**, périmètre **dérivé du sitemap** et non énuméré : chaque tâche de la phase
avait ajouté son audit sur les pages qu'elle venait d'écrire, et P4-07 avait écrit la conséquence —
« un audit d'accessibilité ne couvre que les pages qu'on lui donne ».
⛔⛔ **Un défaut réel encore ouvert après P4-07, trouvé en instruisant `globalNotFound`** : le matcher
du proxy exclut `_next/`, si bien qu'une adresse inconnue sous ce préfixe recevait la 404 **interne**
de Next — `<html>` **sans `lang`**, WCAG 3.1.1. Mesuré avant/après ; `src/app/global-not-found.tsx`
pose le plancher, et un parcours le garde.
⭐⭐ **Le garde des endroits ne tenait qu'un sens** : le compilateur exige qu'un endroit *du type* ait
sa ligne, jamais qu'un `layout.tsx` du disque soit déclaré. Il lit désormais l'arborescence — et a
immédiatement trouvé l'écart `404` / `notFound`.
⭐ Dette des **cinq fichiers non couverts soldée**, et `brand-palette.ts` a demandé mieux qu'un test :
les gardes qui le surveillaient lisaient `src/` comme du **texte** sans charger aucun module. Le garde
des tokens l'**importe** maintenant — strictement plus fort.
⭐⭐ Une mutation survit **à bon droit** : renommer notre `:focus-visible` laisse l'anneau du
navigateur, qui satisfait WCAG 2.4.7. C'est `outline: none` qui doit rougir, et il rougit.
📏 Socle 126,4 Ko, 7,3 Ko par route et image 273 Mo — **tous trois inchangés**. 622 tests, 135 E2E,
**couverture 100 %** sur les quatre métriques : le chiffre que §13.8 croyait annoncer est enfin vrai.
· Depends on: P4-06

**P4-09 — JSON-LD**
Status: **DONE** (2026-08-16) — `Person` et `WebSite` sur l'accueil, `CreativeWork` sur une fiche de
projet, `BreadcrumbList` sur les sections **et** les fiches. Trois couches, comme les métadonnées :
`src/seo/json-ld.ts` fabrique les nœuds et ne lit rien, `src/app/[locale]/structured-data.ts` décide
lesquels une page porte, `src/ui/json-ld.tsx` sérialise.
⭐⭐⭐ **Les quatre arbitrages ont été posés avant d'écrire une ligne**, comme une liste de décisions —
c'est la leçon de §14.8 appliquée le lendemain. L'un d'eux ne pouvait pas être tranché par défaut :
les URL de profils n'existent nulle part dans le dépôt, et **une adresse de profil ne se devine pas**.
⛔ **Le fond de la tâche est ce qui n'est pas affirmé** : ni les niveaux de compétence (D2, ouverte),
ni une organisation employeuse — l'une des deux expériences est le projet propre de l'auteur, société
non constituée —, ni le dépôt d'un projet, que la fiche ne rend pas.
⭐⭐⭐ `dateCreated` est réémis **verbatim** : c'est le dernier endroit où la précision variable de
P4-17 pouvait se perdre, et P4-04 l'avait annoncé en toutes lettres. Un parcours le compare à
l'attribut `datetime` réellement servi.
⭐⭐ **Le garde d'origines de P4-08 a rougi**, et l'assouplir en « toute origine externe est tolérée »
aurait rendu le `localhost` de P4-08 réinvisible dans le garde même qui existe pour lui. Chaque
origine admise est nommée, et importée de sa source.
⛔⛔ La revue a trouvé **quatre défauts** : une œuvre dont l'auteur n'avait pas de nom, une personne
décrite avec la description du **site** — la faute de l'`alt` d'image de P4-08, à l'identique —, un
`Person.url` désignant une redirection, et un parcours qui échouait par `TypeError` avant son
assertion. ⭐ Et la **couverture** a nommé deux branches mortes qu'aucune relecture n'avait vues.
📏 Socle 126,4 Ko et 7,3 Ko par route, **tous deux inchangés** : un bloc `ld+json` est de la donnée,
pas du code. Image 273 Mo, 606 tests, 128 E2E, couverture 98,69 %, 28 mutations toutes tuées.
⭐⭐ L'une d'elles n'est tuée **que par le banc E2E** — une route qui déclare la mauvaise section
laisse les 606 tests verts, les routes étant exclues de Vitest. C'est la première fois que cette
exclusion est éprouvée par une mutation plutôt que défendue par un raisonnement.
· Depends on: P4-05, P4-17

**P4-05 — Liste et détail des projets, corps MDX rendu**
Status: **DONE** (2026-08-16) — la fiche d'un projet compile et rend son corps MDX dans un conteneur
`prose`, **le seul endroit du dépôt où des sélecteurs d'éléments sont légitimes** : le balisage vient
du contenu et ne peut porter aucune classe (exception à l'ADR-0010 bornée à ce conteneur).
⛔⛔ **La prémisse de la tâche était fausse.** Elle était isolée et repoussée après P4-06 « parce
qu'elle fait entrer ~7 Mo dans une image qui n'a que 15 Mo de marge ». Mesuré : l'image pèse
**268,6 Mo** et non 385, la marge est de **131 Mo** et non 15, et le runtime MDX coûte **+0,5 Mo** et
non 7. Le chiffre de 385 Mo était recopié dans quatre documents sans avoir été remesuré depuis la
Phase 1 — et il a réordonné une phase.
⛔⛔⛔ **Le seuil de 400 Mo n'était appliqué nulle part** : la CI écrivait la taille dans son résumé et
n'en faisait rien. Il est **bloquant depuis cette tâche** (`performance-budget.md` §7.2).
⭐ Dette de P4-04 payée : `getTechnologyLabels` remonte la résolution des slugs au dépôt, et **lève**
sur un inconnu — la fiche d'un projet affichait jusqu'ici les slugs bruts, ce qui n'était pas une
duplication mais un défaut. · Depends on: P4-02

**P4-12 — Parcours E2E complets**
Status: **DONE** (2026-08-16) — la tâche était un **inventaire** avant d'être une écriture :
confronter les quatorze scénarios de `testing-strategy.md` §4.7 au banc, et n'écrire que le manquant.
⛔⛔ **L'inventaire a contredit la mission**, qui annonçait E2E-01 à E2E-03, E2E-08 et E2E-12
« couverts par les parcours de P4-07 à P4-11 ». Trois ne l'étaient pas : le parcours **continu** de
E2E-01 avec son retour, la bascule de langue sur une **fiche** (le seul parcours qui touchait le
sélecteur partait d'une section, où le repli et la cible juste sont la même URL), et la moitié
clavier de E2E-08. E2E-11 et E2E-12, eux, l'étaient — sur un périmètre **plus large** que ce que la
stratégie exige.
⭐⭐⭐ **L'inventaire est devenu un garde, pas un paragraphe.**
`every-e2e-scenario-has-a-status.test.ts` lit les scénarios dans le bloc de code de §4.7 et tient
trois sens : un quinzième scénario sans statut rougit, un statut qui nomme un scénario disparu
rougit, et un scénario déclaré couvert qu'aucun parcours ne revendique (`@covers`) rougit — comme un
scénario **reporté** qu'un parcours revendique déjà. Les reports ne pointent que vers des tâches qui
existent (P6-10, P10-10).
⭐⭐ **Une mutation a survécu, et elle avait raison** : `tabIndex={-1}` sur toute la navigation
principale laissait le parcours clavier vert, l'accueil offrant **deux** chemins vers les sections —
l'en-tête et le `SectionGuide`. Le défaut n'était pas la mutation mais le **périmètre** : une seule
page visitée. Le balayage porte désormais aussi sur une page de section, où l'en-tête est la seule
source, et la mutation est tuée. C'est le trou de P4-10 à l'identique — *un garde ne couvre que ce
qu'on lui donne*.
⛔ **Le harnais de mutation a menti à la première exécution** : le filtre `-g` ne correspondait à
aucun test — une apostrophe typographique — et Playwright sort en 1 sur « No tests found », ce que le
harnais a lu comme une mutation tuée. Il vérifie désormais que le filtre **sélectionne** quelque
chose avant de muter. Panne de P4-10 reproduite dans l'outillage qui existe pour la traquer.
📏 140 → **144** E2E ; 627 → **632** tests ; couverture inchangée (100 %). Aucune ligne de `src/` modifiée.
· Depends on: P4-11

**P4-13 — Mise en production (jalon T1)**
Status: **IN_PROGRESS** (2026-08-16). Le site est **déployé en continu depuis P1-15** : la tâche
n'installe rien, elle **prononce** que ce qui est déployé est le portfolio documentaire complet — ce
qui suppose de vérifier ce que les Phases 3 et 4 lui ont laissé.
⛔⛔ **Le critère de sortie « Lighthouse ≥ 85 / a11y 100 / SEO 100 » n'était mesuré nulle part**, et
il l'est maintenant : `scripts/check-lighthouse.mts`, branché sur `make ci` et sur la CI, contre
l'**image de production**, sur deux pages et deux profils. **Accessibilité 100, SEO 100** partout.
⭐⭐ **Trois manières de juger**, parce que les catégories ne se mesurent pas pareil : le score pour
l'accessibilité et le SEO (structurels, bloquants) ; les **audits** pour les bonnes pratiques, dont le
score plafonne à 78 parce que le banc sert du HTTP nu ; un simple **relevé** pour la performance,
mesurée 100 puis 99 sur la même page à deux tirs. Vu rouge trois fois, une par manière de juger.
✅ **Les deux prérequis sont vérifiés sur le serveur** (2026-08-17, en lecture seule, par l'agent SSH
de l'utilisateur — la clé porte une passphrase, qui ne se demande pas). `SITE_URL` coïncide dans ses
**trois** écritures — `.env` du VPS, `Config.Env` du conteneur, `ENV` de l'image — et surtout le site
**sert** ce qu'elles annoncent : `canonical`, trois `hreflang`, 14 URL au sitemap, **zéro d'une autre
origine**. Trois variables peuvent coïncider et un HTML gravé au build dire autre chose.
⛔⛔ **La seconde vérification a démenti une prémisse vieille de quatre phases** : `content/` **est**
dans l'image de production (87 fichiers, 384 Ko), le traceur de Next l'incluant dans la sortie
`standalone`. Quatre documents affirmaient le contraire depuis P2-03 — une **déduction** jamais
mesurée. L'exigence tient (`/fr/inexistant` rend 404 avec `lang`), mais ce qui la protège est le gate
de rendu statique, **et lui seul** : le filet de sécurité auquel la Phase 2 croyait n'existe pas.
⚠️ Ce que P4-13 laisse : la performance contre le **site réel** est P4-16, et suppose de lever Access.
· Depends on: P4-12, P1-15, P2-11

**P4-14 — Supervision**
Status: **DONE** (2026-08-17) — le conteneur porte un `HEALTHCHECK` depuis P1-13, et il
interroge `127.0.0.1` **depuis l'intérieur du conteneur** : un VPS éteint a un healthcheck
parfaitement silencieux. `scripts/check-uptime.mts` regarde le site par le chemin d'un visiteur,
`.github/workflows/uptime.yml` l'exécute toutes les dix minutes, et l'alerte est l'e-mail d'échec
d'Actions — pas un service de plus.
⛔⛔⛔ **La sonde n'est PAS jugeable sur le statut HTTP, et c'est mesuré** : conteneur volontairement
arrêté, `/robots.txt` rend **200 quand même** — Cloudflare compose la réponse à sa périphérie et sert
ses seuls « Content Signals ». Seul le **corps** distingue un site debout d'un site mort (la directive
`Sitemap:` de l'origine y est, ou n'y est pas). Une sonde ordinaire aurait été verte sur la panne
exacte que R-15 décrit.
⭐⭐ **Une réserve de `deploy/README.md` §4.2 est tranchée au passage** : le `robots.txt` managé de
Cloudflare **remplaçait** celui de l'application — le `Sitemap:` n'était annoncé à personne. Depuis
l'application Access en **Bypass** sur ce seul chemin, Cloudflare **fusionne** ; le reste du site est
resté fermé, vérifié URL par URL.
⛔ Un défaut dans la sonde elle-même, trouvé par sa première exécution : elle lisait `SITE_URL`, qui
vaut `http://localhost:3000` dans le conteneur de développement — elle mesurait le mauvais site.
✅ **Le critère d'acceptation est tenu, et il l'est par une exécution** : conteneur de production
arrêté 58 s, sonde **rouge** depuis GitHub, **e-mail d'alerte reçu**, puis verte au redémarrage
(`deploy/README.md` §7.4 et §7.4 bis).
⚠️ Le premier tir **planifié** n'est pas tombé à l'heure ronde : la planification d'Actions est « au
mieux », propriété annoncée par le workflow et vérifiée le jour même. Ce que la sonde garantit est
« une panne ne dure pas des jours », pas « une panne est vue en dix minutes ».
· Depends on: P4-13

**P4-15 — Checklist de mise en ligne et rollback rejoué**
Status: **DONE** (2026-08-18) — la checklist vit dans `deploy/README.md` §8, écrite **après
exécution** : la moitié « déployer » jouée par la fusion de la PR #33, la moitié « revenir » par un
aller-retour réel sur la production (§4.3). La Phase 15 la réutilise.
⛔⛔⛔ **Le rejeu a démenti l'état annoncé** : le rollback était réputé *prouvé* depuis P1-15 — « 26
sondes HTTPS, aucun échec » — mais cette mesure date du 2026-08-11, **proxy Cloudflare en *DNS
only***. Depuis la bascule en *Full (strict)* du 2026-08-12, une 200 ne parle plus de l'origine, et
refaire ce geste aujourd'hui rendrait 26 verts sur un site mort. ⭐⭐⭐ **Une preuve d'exploitation
peut se périmer sans jamais devenir fausse** — elle se relit exactement comme au premier jour.
⛔⛔ **La coupure existe, et un statut ne la voit pas** : rejeu jugé sur le corps, à ~5-6 verdicts par
seconde, **~1 s d'origine absente** à l'aller — sous un **200 constant**, corps servi par Cloudflare.
Aucune au retour : le défaut n'est **pas déterministe**, raison non établie.
⭐⭐ **La mesure emploie la sonde de P4-14 mise en boucle**, `UPTIME_RETRY_DELAY_MS=0` : dix fois la
cadence de P1-15 sans changer d'un mot ce qui est vérifié.
⭐ **Symétrie du verbe reconfirmée** : `rollback` a servi dans les deux sens, état final identique à
l'état initial.
⚠️ Ce que P4-15 laisse : la bascule **sans coupure** est hors périmètre (assumée, nommée en §8.5), et
rien ne garde les références `§x.y` recopiées dans des chaînes de caractères.
· Depends on: P4-13, P1-15
Acceptance:
- Checklist de mise en ligne écrite, **et chacun de ses points exécuté** au moins une fois.
- Rollback rejoué en conditions réelles, **jugé par la sonde externe** et non par un contrôle écrit
  pour l'occasion.
- Disponibilité pendant l'opération **mesurée**, avec la cadence et les réserves de la mesure.
- Procédure de retour utilisable sans relire le journal de phase.

**P4-16 — Vérification post-déploiement, depuis l'extérieur**
Status: **DONE** (2026-08-20) — Cloudflare Access **levé temporairement** à la demande de
l'exploitant : le site a été réellement public le temps de la mesure. 14 URL au sitemap, 14 pages
servies, `lang` / `canonical` / `hreflang` concordants — **0 écart sur 14**. Les 404 localisées
tiennent en production, `/_next/inexistant` compris. Relevés en `deploy/README.md` §9.
✅ **Le relevé Lighthouse que P4-13 avait renvoyé ici est pris, contre le SERVICE** : accessibilité
100, SEO 100, **bonnes pratiques 100**, performance 98 mobile / 100 desktop.
⭐⭐ **Le 78 local en « bonnes pratiques » n'était pas une dette, c'était l'adresse d'interrogation** —
`is-on-https` ne peut passer que sur une origine en HTTPS. Juger la catégorie sur ses *audits* a
évité d'inscrire une fausse dette au budget.
⛔⛔ **Deux instruments ont menti avant toute vérification** : une lecture sensible à la casse rendait
« aucun hreflang » sur quatorze pages qui en portent trois (Next sert `hrefLang`, valide en HTML), et
`check-lighthouse.mts` imprimait « contre l'image de production » et « ce banc sert du HTTP nu »
**pendant qu'il auditait le site en HTTPS**. ⭐⭐⭐ **Une absence et un instrument aveugle se lisent
exactement pareil.**
⭐ Outil laissé : `make check-public-seo`, rejouable, origine par argument. ⛔ **Il ne peut pas être
un gate de CI** — derrière Access il serait rouge en permanence, pour une raison qui n'est pas un
défaut ; il nomme ce cas au lieu de rendre « 302 inattendue ».
⚠️ Ce que la tâche ne dit pas : rien sur l'indexation **effective** — aucun moteur sollicité, aucune
Search Console déclarée. Le site est établi *indexable*, pas *indexé*.
· Depends on: P4-13, P4-14
Acceptance:
- `canonical`, `hreflang`, `lang`, sitemap et `robots.txt` observés **depuis l'extérieur**, en
  visiteur anonyme, et **concordants entre eux**.
- Lighthouse mesuré contre le **site réel**, seuils de sortie de phase appliqués.
- Vérification **rejouable** par un outil du dépôt, et non par une session d'observation.

**Critères de sortie** — Toutes les exigences de la §20 de la mission satisfaites ; Lighthouse
mobile ≥ 85 / a11y 100 / SEO 100 ; 0 violation axe serious/critical ; le projet `no-js` passe ;
**aucune dépendance Three.js dans le dépôt à ce stade** ; **site en ligne, supervisé, avec un
rollback prouvé**.

✅ ~~**Le critère Lighthouse n'est mesuré nulle part**~~ — constaté pendant l'inventaire de P4-12,
**soldé en P4-13** : `scripts/check-lighthouse.mts` le mesure contre l'image de production, sur
`make ci` et sur la CI. Accessibilité et SEO bloquent à 100 ; les bonnes pratiques sont jugées sur
leurs audits ; la performance est relevée. ✅ **Le volet « site réel » est soldé en P4-16** — a11y
100, SEO 100, bonnes pratiques 100, performance 98 mobile / 100 desktop, Access levé
(`performance-budget.md` §3).

✅ ~~**Site supervisé**~~ — **soldé en P4-14** : le healthcheck du conteneur ne voit que l'intérieur
du conteneur ; une sonde externe le complète, vue rouge sur un arrêt volontaire de la production,
alerte reçue.

✅ ~~**Rollback prouvé**~~ — **soldé en P4-15**, et pas comme prévu : la preuve de P1-15 est
**périmée** (prise en *DNS only*, son critère a cessé de parler de l'origine le 2026-08-12). Rejoué
le 2026-08-18, jugé sur le corps : aller-retour par le même verbe, **~1 s d'origine absente sous un
200 constant** à l'aller, aucune au retour. Checklist en `deploy/README.md` §8.

> P4-13 à P4-16 constituent le jalon **T1**. Ce sont des mises en production anticipées : la
> Phase 15 reste la release du produit complet et **réutilisera la checklist établie en P4-15**
> plutôt que d'en créer une seconde.

---

## PHASE 5 — Fondation Three.js

| ID | Tâche | Dépend de |
|---|---|---|
| P5-01 | Vérification de la matrice de compatibilité React / R3F / drei (risque R-08) — **DONE** *(2026-08-20)* | P4-12 |
| P5-02 | Installation justifiée de `three`, `@react-three/fiber`, `@react-three/drei` | P5-01 |
| P5-03 | `resolveCapabilityTier` (fonction pure) + adaptateur navigateur | P5-02 |
| P5-04 | Montage du canvas : dynamique, `ssr:false`, après idle, `aria-hidden` | P5-03 |
| P5-05 | Scène primitive : bureau + trois écrans en géométries de base | P5-04 |
| P5-06 | Caméra, éclairage, environnement minimal | P5-05 |
| P5-07 | Error boundary du canvas + gestion de `webglcontextlost` → palier `none` | P5-04 |
| P5-08 | Panneau de diagnostic : FPS, draw calls, triangles, mémoire | P5-06 |
| P5-09 | Test de non-régression : aucun module `three` dans les chunks initiaux | P5-04 |
| P5-10 | Boucle de rendu à la demande, pause hors écran / onglet masqué | P5-06 |

**P5-01 — Matrice de compatibilité React / R3F / drei**
Status: **DONE** (2026-08-20) — **GO pour P5-02** aux versions `three@0.185.1`,
`@react-three/fiber@9.7.0`, `@react-three/drei@10.7.8`, `@types/three@0.185.4`. Vérifiée **dans un
bac à sable jetable**, aucune dépendance ajoutée au dépôt : P5-01 devait pouvoir conclure NO-GO sans
laisser de trace à défaire. Journal : [`phase-5-log.md`](./phase-5-log.md) §1.
⭐⭐ **Trois preuves, pas une lecture de `peerDependencies`** : installation `pnpm` sans un
avertissement de pair ; `tsc 6.0.3 --noEmit` avec les options strictes du dépôt sur une scène
représentative, **zéro erreur** ; et la scène **réellement montée par le réconciliateur de R3F** en
Node sans WebGL (`@react-three/test-renderer`) — seule cette dernière prouve que React 19.2.8 et R3F
9.7.0 s'accordent à l'exécution.
⛔⛔⛔ **Le poids décide, et il se mesure AVANT d'installer** : `drei` importé **en entier** pèse
**802,8 Ko gzip**, soit 2,5 fois le seuil bloquant ; **quatre composants** courants coûtent +65,3 Ko
et ne laissent que 16 Ko sous ce seuil ; **un** composant est gratuit (+0,9 Ko). Le budget se joue
sur la **forme et le nombre** des imports — contrainte dure, à transformer en **garde** (P5-02 ou
P5-09), et qui doit **compter**, pas seulement interdire `export *`.
⛔⛔ **Le plancher mesuré est 237,5 Ko** — R3F et `three`, sans une ligne de drei — donc **la cible de
220 Ko lui est inférieure et rien ne peut la tenir**. Décision **D9** ouverte
(`performance-budget.md` §4.3) ; elle emporte aussi la ligne de la Phase 8.
⛔ **Une première mesure était fausse et avait l'air juste** : deux entrées non comparables rendaient
un sur-ensemble plus léger que son sous-ensemble. Trouvée en revue ; le harnais est désormais
versionné (`tools/compat-3d/`) pour qu'un chiffre de budget reste recontrôlable.
⚠️ **Plafond de version latent** : R3F exige `react >=19 <19.3`. Nous sommes en 19.2.8, **qui est la
dernière publiée** — le plafond ne mord pas aujourd'hui, mais dès P5-02 une montée en 19.3 devient un
choix **contre** R3F, plus une montée de routine.
⚠️ Ce que P5-01 ne dit pas : rien du comportement **dans Next 16.3** — import dynamique `ssr: false`,
découpage des chunks et absence du chemin critique sont P5-04 et P5-09.
· Depends on: P4-12
Acceptance:
- Versions compatibles **établies par exécution**, pas par lecture de contraintes déclarées.
- Aucune dépendance ajoutée au dépôt tant que le verdict n'est pas rendu.
- Poids réel du chunk mesuré et confronté au budget **avant** l'installation.
- Verdict explicite GO / NO-GO, et contraintes d'usage écrites.

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
