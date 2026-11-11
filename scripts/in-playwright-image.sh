#!/usr/bin/env bash
#
# Exécute une commande dans l'image Playwright de la CI (`PLAYWRIGHT_IMAGE`,
# job `e2e` de `.github/workflows/ci.yml`), avec le Node du RUNNER.
#
# ⭐ L'image n'apporte que les navigateurs et leurs bibliothèques système — ce
# qu'`apt` ne savait plus fournir le 2026-11-11. Le Node qui exécute les tests
# reste celui que `actions/setup-node` a installé depuis la source unique
# (`ARG NODE_VERSION` du Dockerfile) : l'image porte le sien (26), hors de
# l'intervalle `engines` du projet. Le répertoire de Node est monté en lecture
# seule et placé en tête du PATH.
#
# Le dépôt est monté au MÊME chemin (liens de `node_modules` de pnpm), le site
# testé est sur `localhost` du runner (`--network host`), et les rapports
# appartiennent au compte du runner (`--user`).
#
# Une seule liste de variables pour toutes les étapes : deux listes recopiées
# divergeaient déjà à la première écriture.
set -euo pipefail

: "${PLAYWRIGHT_IMAGE:?PLAYWRIGHT_IMAGE absente : ce script ne sert que dans le job e2e}"

node_home="$(dirname "$(dirname "$(command -v node)")")"

exec docker run --rm --network host --ipc=host \
  --user "$(id -u):$(id -g)" -e HOME=/tmp \
  -v "$node_home:/opt/runner-node:ro" \
  -e PATH="/opt/runner-node/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" \
  -v "$PWD:$PWD" -w "$PWD" \
  -e PLAYWRIGHT_BASE_URL -e SITE_URL -e CI -e GITHUB_ACTIONS -e GITHUB_WORKSPACE \
  "$PLAYWRIGHT_IMAGE" "$@"
