#!/usr/bin/env bash
#
# Point d'entrée UNIQUE de la clé de déploiement de la CI (P1-15, ADR-0008).
#
# La clé publique correspondante est enregistrée dans `authorized_keys` avec
# `command="/srv/portfolio/deploy.sh"` : tout ce que la CI demande arrive ici, et
# nulle part ailleurs. Si le secret GitHub fuite, l'attaquant n'obtient pas un
# shell — il obtient ce script, dont la surface tient dans le `case` ci-dessous.
#
# Verbes acceptés, via SSH_ORIGINAL_COMMAND :
#   deploy <sha40>   déploie ce tag précis
#   rollback         revient au tag précédemment servi
#   status           imprime l'état courant (lecture seule)
#
# Ce fichier vit dans le dépôt et est copié sur le VPS. La copie qui s'exécute
# est `/srv/portfolio/deploy.sh`.

set -euo pipefail

STACK=/srv/portfolio
COMPOSE="$STACK/docker-compose.yml"
ENV_FILE="$STACK/.env"
PREVIOUS="$STACK/.tag.previous"
HEALTH_TIMEOUT=120

LOCK="$STACK/.deploy.lock"
LOG_FILE="$STACK/deploy.log"
# Pire cas d'un déploiement : pull, puis deux attentes de santé (le déploiement et
# son retour automatique) de HEALTH_TIMEOUT chacune. Le verrou attend davantage.
LOCK_TIMEOUT=600

log() { printf '%s %s\n' "$(date -u +%H:%M:%S)" "$*"; }
is_full_sha() { [[ "$1" =~ ^[0-9a-f]{40}$ ]]; }

# --- Analyse de la demande -------------------------------------------------
# `read` sur une seule ligne : aucune substitution de commande n'est possible,
# la demande n'est jamais évaluée par le shell.
read -r VERB ARG _ <<<"${SSH_ORIGINAL_COMMAND:-}"

case "${VERB:-}" in
  deploy)
    # Un SHA de commit complet, et rien d'autre. Pas de `latest`, pas de nom de
    # branche : le tag déployé doit désigner un état exact du dépôt.
    is_full_sha "${ARG:-}" || { echo "tag invalide: '${ARG:-}'" >&2; exit 2; }
    TAG="$ARG"
    ;;
  rollback)
    ;;
  status)
    # Volontairement sans `docker compose` : la composition exige `IMAGE_TAG`,
    # or `status` doit rester lisible précisément quand rien n'est déployé —
    # c'est le moment où l'on en a le plus besoin.
    docker ps -a --filter 'label=com.docker.compose.project=portfolio' \
      --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'
    echo "tag courant   : $(grep -oP '^IMAGE_TAG=\K.*' "$ENV_FILE" 2>/dev/null || echo '-')"
    echo "tag précédent : $(cat "$PREVIOUS" 2>/dev/null || echo '-')"
    exit 0
    ;;
  *)
    echo "commande refusée: '${SSH_ORIGINAL_COMMAND:-}'" >&2
    exit 2
    ;;
esac

# --- Survivre à la session SSH ---------------------------------------------
# ⛔ Une coupure SSH (runner perdu, réseau) envoie SIGHUP au script : tué entre
# `compose up` et `wait_healthy`, il laisserait le serveur à moitié déployé,
# sans rollback ni `.tag.previous` à jour. Ignorer HUP ne suffit pas : la
# première écriture sur la sortie fermée lève SIGPIPE, puis EPIPE sous
# `set -e`. Donc :
#   - HUP et PIPE ignorés — l'ignorance s'hérite, `docker compose` compris ;
#   - toute la sortie passe par `tee`, qui écrit `deploy.log` et continue
#     quand la session a disparu (`warn-nopipe`) : le récit d'un déploiement
#     orphelin reste lisible après coup.
# `status` est sorti plus haut : il reste en lecture seule, sans verrou.
trap '' HUP PIPE
# Le journal garde ses 2 000 dernières lignes : il raconte des déploiements, il
# n'a pas à grossir à chaque fusion pour toujours.
if [[ -f "$LOG_FILE" ]]; then
  tail -n 2000 "$LOG_FILE" > "$LOG_FILE.tmp" && mv "$LOG_FILE.tmp" "$LOG_FILE"
fi
exec > >(tee -a --output-error=warn-nopipe "$LOG_FILE") 2>&1

# Un seul déploiement à la fois. La CI sérialise déjà ses runs de `main`
# (`concurrency` sans annulation) ; ce qui peut se chevaucher, c'est un
# déploiement ORPHELIN — qui continue après la coupure de sa session, voir
# ci-dessus — et le suivant, ou un `rollback` manuel lancé pendant un `deploy`.
# Le second attend ; au-delà de LOCK_TIMEOUT, il échoue bruyamment plutôt que
# de forcer.
exec 9>"$LOCK"
flock -w "$LOCK_TIMEOUT" 9 || { log "un autre déploiement tient le verrou depuis plus de ${LOCK_TIMEOUT}s" >&2; exit 75; }

# La cible d'un `rollback` se lit APRÈS le verrou : lue avant, elle pourrait
# précéder la réécriture de `.tag.previous` par un déploiement en cours.
if [[ "$VERB" == rollback ]]; then
  TAG="$(cat "$PREVIOUS" 2>/dev/null || true)"
  is_full_sha "$TAG" || { log "aucun tag précédent exploitable" >&2; exit 2; }
  log "rollback vers $TAG"
fi

CURRENT="$(grep -oP '^IMAGE_TAG=\K.*' "$ENV_FILE" 2>/dev/null || true)"

# --- Bascule ---------------------------------------------------------------
set_tag() {
  # Réécriture atomique : un `sed -i` interrompu laisserait un fichier tronqué,
  # donc une pile qui ne redémarre plus.
  local tag="$1" tmp
  tmp="$(mktemp "$STACK/.env.XXXXXX")"
  grep -v '^IMAGE_TAG=' "$ENV_FILE" > "$tmp" || true
  printf 'IMAGE_TAG=%s\n' "$tag" >> "$tmp"
  chmod 600 "$tmp"
  mv "$tmp" "$ENV_FILE"
}

wait_healthy() {
  local cid deadline status
  deadline=$((SECONDS + HEALTH_TIMEOUT))
  cid="$(docker compose -f "$COMPOSE" ps -q web)"
  [[ -n "$cid" ]] || { echo "aucun conteneur démarré" >&2; return 1; }
  while ((SECONDS < deadline)); do
    status="$(docker inspect --format '{{.State.Health.Status}}' "$cid" 2>/dev/null || echo unknown)"
    case "$status" in
      healthy)   return 0 ;;
      unhealthy) docker logs --tail 50 "$cid" >&2; return 1 ;;
    esac
    sleep 3
  done
  echo "sain jamais atteint en ${HEALTH_TIMEOUT}s" >&2
  docker logs --tail 50 "$cid" >&2
  return 1
}

log "déploiement de $TAG (courant: ${CURRENT:-aucun})"
set_tag "$TAG"
docker compose -f "$COMPOSE" pull --quiet web
docker compose -f "$COMPOSE" up -d web

if wait_healthy; then
  # Le tag précédent n'est enregistré qu'après un succès : sinon un déploiement
  # raté écraserait la seule cible de rollback connue.
  [[ -n "$CURRENT" && "$CURRENT" != "$TAG" ]] && printf '%s\n' "$CURRENT" > "$PREVIOUS"
  log "OK — $TAG est sain et sert le site"
  exit 0
fi

# --- Rollback automatique --------------------------------------------------
log "ÉCHEC — le conteneur n'est pas devenu sain"
if [[ -n "$CURRENT" && "$CURRENT" != "$TAG" ]]; then
  log "retour automatique à $CURRENT"
  set_tag "$CURRENT"
  docker compose -f "$COMPOSE" up -d web
  if wait_healthy; then
    log "site rétabli sur $CURRENT"
  else
    log "ALERTE — le retour à $CURRENT a échoué lui aussi, intervention manuelle requise"
  fi
else
  log "aucun état antérieur : la pile reste arrêtée plutôt que de servir une version cassée"
fi
exit 1
