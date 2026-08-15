# syntax=docker/dockerfile:1
#
# Étages : base → deps → dev / build → runner   (ADR-0007 §Structure de l'image)
#
# SOURCE UNIQUE de la version de Node pour tout le projet (développement, CI,
# production). `package.json#engines` et le workflow CI en dérivent et ne doivent
# jamais être modifiés seuls.
#
# L'image est pinnée par digest : le tag seul est mutable et ferait dériver
# silencieusement l'environnement. Les deux valeurs se mettent à jour ensemble.
#   node:24.19.0-bookworm-slim — Node 24 « Krypton », LTS active au 2026-08-11
ARG NODE_VERSION=24.19.0
ARG NODE_IMAGE_DIGEST=sha256:3638d9a6fe4030bd716be989438248074489337ba3275657f93595428be4fc03

# ---------------------------------------------------------------------------
# base — socle commun : Node, pnpm via corepack, utilisateur non privilégié
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim@${NODE_IMAGE_DIGEST} AS base

ENV PNPM_HOME=/home/node/.local/share/pnpm \
    COREPACK_HOME=/home/node/.cache/node/corepack \
    NEXT_TELEMETRY_DISABLED=1
ENV PATH=$PNPM_HOME/bin:$PATH

# `node_modules` et `.next` sont créés ici, appartenant à `node`, pour que les
# volumes nommés de Compose héritent de cette propriété à leur création. Sans
# cela ils naissent root et le conteneur non privilégié ne peut pas y écrire.
#
# L'emplacement du store pnpm est imposé par `pnpm-workspace.yaml` (`storeDir`) :
# voir le commentaire de ce fichier. Ni `npm_config_store_dir` ni un `.npmrc` ne
# fonctionnent avec pnpm 11 — les deux ont été essayés et vérifiés inopérants.
RUN corepack enable \
 && mkdir -p /app/node_modules /app/.next "$PNPM_HOME/bin" "$COREPACK_HOME" \
 && chown -R node:node /app /home/node

WORKDIR /app
USER node

# ---------------------------------------------------------------------------
# deps — dépendances installées depuis le seul lockfile (couche très cachable)
#        utilisée par `build` et `runner` (P1-13), pas par `dev`.
# ---------------------------------------------------------------------------
FROM base AS deps

# `pnpm-workspace.yaml` fait partie des fichiers de résolution : il porte
# l'emplacement du store et la politique de scripts d'installation. L'oublier
# fait échouer l'étage avec `ERR_PNPM_IGNORED_BUILDS`.
COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/app/node_modules/.pnpm-store,uid=1000,gid=1000 \
    corepack install && pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
# dev — serveur de développement, lint, typecheck, tests unitaires
#       Les dépendances ne sont PAS copiées dans l'image : elles vivent dans le
#       volume nommé `node_modules`, alimenté par `make install`. L'image reste
#       ainsi valide quel que soit l'état du lockfile de l'hôte.
# ---------------------------------------------------------------------------
FROM base AS dev

ENV NODE_ENV=development

# Matérialise la version de pnpm déclarée dans package.json#packageManager, pour
# qu'aucun téléchargement ne soit nécessaire au premier démarrage du conteneur.
COPY --chown=node:node package.json ./
RUN corepack install

EXPOSE 3000
CMD ["pnpm", "dev"]

# ---------------------------------------------------------------------------
# build — compilation de production (`output: 'standalone'`)
# ---------------------------------------------------------------------------
FROM base AS build

ENV NODE_ENV=production

# L'origine du site est un **argument de construction**, et pas seulement une
# variable d'exécution (P3-06).
#
# Toutes les pages de contenu sont statiques (`architecture.md` §4.2) : leurs
# `canonical`, leurs `hreflang` et le sitemap sont donc écrits **pendant** cette
# étape, pas à la requête. Sans cette valeur ici, `next build` échoue — ce qui est
# le comportement voulu : une origine devinée produirait des URL fausses, c'est-à-dire
# une erreur qui ne se voit qu'une fois le site indexé.
#
# Aucune valeur par défaut : un défaut silencieux publierait des canoniques vers
# `localhost`. L'appelant la fournit (`docker-compose*.yml`, CI).
ARG SITE_URL
ENV SITE_URL=${SITE_URL}

COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .

RUN pnpm build

# ---------------------------------------------------------------------------
# runner — artefact de production (ADR-0008)
#          C'est exactement cette image qui tourne sur le VPS. Elle ne contient
#          ni gestionnaire de paquets, ni sources, ni dépendances de build.
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim@${NODE_IMAGE_DIGEST} AS runner

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# La même origine qu'à la construction, inscrite dans l'image : celle-ci devient
# **auto-descriptive**, et un consommateur d'exécution (Phase 10, expédition du
# CV) voit exactement l'origine qui a été gravée dans le HTML.
#
# ⚠️ Un `env_file` de Compose l'emporte sur cette valeur. `/srv/portfolio/.env`
# porte encore `SITE_URL` : les deux doivent coïncider, faute de quoi le site
# servirait des canoniques d'un domaine et enverrait des liens vers un autre.
# Point ajouté à la checklist de P4-13, et tracé dans `phase-3-log.md`.
ARG SITE_URL
ENV SITE_URL=${SITE_URL}

WORKDIR /app
# Non-root : l'utilisateur `node` de l'image officielle, jamais `root`.
USER node

# `standalone` contient le serveur et ses dépendances ; les fichiers statiques et
# `public/` sont copiés à part, Next ne les embarquant pas.
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public

EXPOSE 3000

# Sonde identique à celle du service de développement : une seule définition de
# « le site répond » pour Compose, pour Docker et, en P1-15, pour le déploiement.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
