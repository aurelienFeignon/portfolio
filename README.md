# Portfolio

Portfolio de développeur Full-Stack : un site documentaire bilingue (rendu serveur, indexable,
accessible) enrichi, dans un second temps, d'une scène 3D qui n'en est jamais la source de vérité.

> **État** — Phase 1 (fondation technique) en cours. L'application Next.js n'est pas encore
> initialisée (P1-03). Voir [`docs/roadmap.md`](docs/roadmap.md) pour les statuts détaillés.

---

## Prérequis

**Un seul principe : rien n'est installé sur l'hôte, tout s'exécute en conteneur**
([ADR-0007](docs/adr/0007-dockerized-development-environment.md)). Node.js n'est **pas** requis, et
ne doit pas l'être.

| Outil | Rôle |
|---|---|
| Docker + Compose v2 | Exécute la totalité de l'environnement |
| Git | Versionnement |
| GNU Make | Interface de commandes stable (voir plus bas) |

L'utilisateur doit appartenir au groupe `docker` :

```bash
sudo usermod -aG docker "$USER"   # puis ouvrir une nouvelle session
make doctor                       # vérifie que tout est en place
```

Le dépôt doit résider dans le **système de fichiers natif WSL2** (`/home/...`), jamais sous
`/mnt/c/...` : la surveillance de fichiers (donc le hot reload) y est inopérante.

## Démarrage

```bash
git clone <dépôt> && cd portfolio
make image      # construit l'image de développement
make install    # installe les dépendances dans le volume nommé
make up         # http://localhost:3000 → redirige vers /fr ou /en selon votre navigateur
```

**`SITE_URL`** est l'origine publique du site, et elle est nécessaire **à la construction** autant
qu'à l'exécution : toutes les pages étant statiques, leurs `canonical`, leurs `hreflang` et le
sitemap sont gravés pendant le build. Les fichiers Compose fournissent une valeur locale par défaut
(`http://localhost:3000`, `:3001` en production locale) ; copier [`.env.example`](.env.example) en
`.env` permet de la changer.

## Commandes

`make help` liste les cibles disponibles. **Ce sont les seules commandes documentées** : aucune
variante `pnpm ...` ou `docker ...` n'est maintenue en parallèle, précisément pour qu'elles ne
divergent pas.

| Commande | Effet |
|---|---|
| `make doctor` | Vérifie les prérequis de l'hôte |
| `make image` | Construit l'image de développement |
| `make install` | Installe les dépendances (volume `node_modules`) |
| `make up` / `make up-d` | Démarre le serveur de développement |
| `make down` | Arrête les conteneurs, conserve les volumes |
| `make sh` | Shell dans le conteneur |
| `make logs` / `make ps` | Journaux, état |
| **`make ci`** | **Enchaîne tous les gates, comme la CI** |
| `make lint` | ESLint + Prettier + règles de cloisonnement |
| `make typecheck` | `tsc --noEmit`, zéro erreur exigée |
| `make test` / `make test-watch` | Vitest (unitaires, composants) |
| `make coverage` | Tests + seuils de couverture |
| `make bundle` | Mesure le JS de première visite, applique les budgets |
| `make check-content` | Valide tout le contenu Markdown/MDX (CF-10) — déjà inclus dans `build` |
| *(dans `build`)* `check-static` | Vérifie qu'**aucune route ne se rend à la demande** — `content/` n'étant pas dans l'image de production, une route dynamique échouerait chez le visiteur |
| `make build` | Construit l'image de **production** |
| `make prod-up` / `make prod-down` | Lance l'image de production sur `:3001` |
| `make e2e` | Playwright contre le serveur de développement |
| `make e2e-prod` | Playwright contre l'**image de production** |
| `make reset` | **Destructif** : supprime conteneurs et volumes |

`make ci` enchaîne : `image → install → lint → typecheck → coverage → bundle → build → e2e-prod`.
`make test` n'y figure pas séparément — `coverage` exécute la même suite et y ajoute les seuils ;
l'appeler deux fois coûterait sans rien prouver de plus.

## Versions

La version de Node est définie **en un seul endroit** : les `ARG NODE_VERSION` /
`NODE_IMAGE_DIGEST` du [`Dockerfile`](Dockerfile). `package.json#engines` et la CI en dérivent.

| Élément | Version | Motif |
|---|---|---|
| Node | 24.19.0 (« Krypton ») | LTS active ; image pinnée **par digest**, le tag seul étant mutable |
| pnpm | 11.21.0 | Voir ci-dessous |
| Next.js | 16.3.0 | App Router, TypeScript |
| React | 19.2.8 | Pair déclaré par Next 16 ; compatibilité R3F revérifiée en P5-01 |
| TypeScript | 6.0.3 | Et non 7.0.2 : hors du domaine supporté par `typescript-eslint`, donc perte du lint typé — voir [`docs/phase-1-log.md`](docs/phase-1-log.md) §4 |

**Gestionnaire de paquets : pnpm.** Installation par liens durs depuis un store partagé (une image
de conteneur reconstruite fréquemment y gagne en temps et en disque), `node_modules` non plat donc
dépendances fantômes impossibles — ce qui fait échouer au plus tôt un import non déclaré, plutôt
qu'en production. Activé par corepack à partir de `package.json#packageManager`, donc une seule
source de vérité pour sa version.

## Organisation

```text
docs/                     décisions, roadmap, stratégies      ← à lire en premier
docs/adr/                 décisions d'architecture (ADR)
content/                  source de vérité du contenu (Markdown) — Phase 2
src/                      un README par dossier : responsabilité + dépendances autorisées
  app/[locale]/           App Router — layout **racine**, d'où `<html lang>` (mise en forme : Phase 4)
  proxy.ts                `/` négocie la langue et redirige (307 + `Vary`)
  content/ i18n/ routing/ scene/ ui/ features/ seo/
tests/                    unit · components · e2e (par profil)
scripts/                  outillage de build (contenu, budget de bundle, rendu statique)
deploy/                   Caddyfile de la pile « edge » du VPS
Dockerfile                étages base / deps / dev / build / runner
docker-compose.yml        développement (web + e2e)
docker-compose.prod.yml   image de production, exécutée localement
Makefile                  interface de commandes
pnpm-workspace.yaml       réglages pnpm — pas un monorepo, voir le fichier
```

Le **cloisonnement entre couches** (`architecture.md` §1.2) est appliqué par ESLint, pas seulement
documenté : un import interdit fait échouer `make lint`. Chaque `README.md` de dossier rappelle ce
qu'il a le droit d'importer.

## Où lire les décisions

| Document | Contenu |
|---|---|
| [`docs/roadmap.md`](docs/roadmap.md) | **Source de vérité des tâches et des statuts** |
| [`docs/vision.md`](docs/vision.md) | Vision, contraintes, risques, hypothèses |
| [`docs/architecture.md`](docs/architecture.md) | Couches, flux, Docker, déploiement |
| [`docs/adr/README.md`](docs/adr/README.md) | Index des décisions et journal des révisions |
| [`docs/testing-strategy.md`](docs/testing-strategy.md) | Ce qui est testé, comment, seuils |
| [`docs/performance-budget.md`](docs/performance-budget.md) | Budgets chiffrés |
| [`docs/phase-1-log.md`](docs/phase-1-log.md) | Journal de la phase en cours |
