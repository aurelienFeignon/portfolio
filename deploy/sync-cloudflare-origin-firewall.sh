#!/usr/bin/env bash
#
# N'autorise 80/443 sur l'origine que depuis les plages publiées par Cloudflare.
#
# Pourquoi : le proxy Cloudflare ne protège que le trafic qui passe par lui. Tant
# que l'origine répond à tout le monde, il suffit de connaître son IP pour
# contourner l'absorption DDoS, le rate limiting et toute règle de filtrage — et
# cette IP est publique de fait (historique DNS, scans TLS de l'espace IPv4).
# Cacher l'IP est impossible ; refuser le trafic qui ne vient pas de Cloudflare
# ne l'est pas.
#
# ─────────────────────────────────────────────────────────────────────────────
# POURQUOI PAS `ufw` — leçon payée sur cette machine
#
# Les ports 80/443 sont publiés par un conteneur. Les paquets atteignent Caddy
# par FORWARD → DOCKER, et ne traversent JAMAIS les règles INPUT d'`ufw`. Une
# règle `ufw allow from <cloudflare> to any port 443` est donc parfaitement
# inopérante ici — pire, elle affiche un filtrage qui n'existe pas.
#
# La seule chaîne évaluée avant les règles de Docker est `DOCKER-USER`. C'est là
# que ce script travaille.
# ─────────────────────────────────────────────────────────────────────────────
#
# Le port 22 n'est JAMAIS touché : le déploiement part des runners GitHub, dont
# les adresses changent à chaque exécution (voir README §6.1). Ce script ne
# filtre que 80 et 443, et uniquement pour le trafic destiné aux conteneurs.
#
# Le renouvellement du certificat continue de fonctionner : le challenge ACME
# arrive par Cloudflare, ce qui a été vérifié avant d'écrire ce script.
#
# Usage :
#   sudo ./sync-cloudflare-origin-firewall.sh --apply     récupère les plages, applique, mémorise
#   sudo ./sync-cloudflare-origin-firewall.sh --restore   réapplique la liste mémorisée, SANS réseau
#   sudo ./sync-cloudflare-origin-firewall.sh --check     signale une dérive, ne change rien (exit 1)
#
# `--restore` est ce qui tourne au démarrage : récupérer la liste sur le réseau
# à ce moment-là ferait échouer l'application si Cloudflare est injoignable, et
# l'origine resterait grande ouverte. On préfère une liste d'hier appliquée
# qu'une liste du jour jamais appliquée.

set -euo pipefail

MODE="${1:---check}"
STATE_V4=/srv/edge/.cloudflare-ranges-v4
STATE_V6=/srv/edge/.cloudflare-ranges-v6
CHAIN=CF-ORIGIN
PORTS=80,443

die() { echo "ERREUR: $*" >&2; exit 2; }
[[ $EUID -eq 0 ]] || die "à exécuter en root (sudo)"

# --- Récupération et garde-fous --------------------------------------------
fetch() {
  local url="$1" out="$2" min="$3" pattern="$4" n
  curl -fsS --max-time 20 "$url" -o "$out" || die "récupération impossible ($url) — rien n'a été modifié"
  grep -vE '^\s*$' "$out" | sort -u > "$out.clean" && mv "$out.clean" "$out"
  # Une réponse tronquée, une page d'erreur servie en 200, un portail captif :
  # sans ces deux contrôles, on viderait la liste et le site deviendrait
  # injoignable. Le script préfère ne rien faire.
  while read -r cidr; do
    [[ "$cidr" =~ $pattern ]] || die "entrée inattendue : « $cidr » — rien n'a été modifié"
  done < "$out"
  n=$(wc -l < "$out")
  (( n >= min )) || die "$n plages seulement depuis $url, seuil de vraisemblance non atteint — rien n'a été modifié"
}

# --- Application des règles -------------------------------------------------
# La chaîne est reconstruite entièrement à chaque fois : idempotent, et l'état
# obtenu ne dépend pas de l'état précédent.
build() {
  local ipt="$1" list="$2"
  "$ipt" -N "$CHAIN" 2>/dev/null || true
  "$ipt" -F "$CHAIN"
  while read -r cidr; do
    [[ -n "$cidr" ]] && "$ipt" -A "$CHAIN" -s "$cidr" -j RETURN
  done < "$list"
  "$ipt" -A "$CHAIN" -j DROP
  # Accroche dans DOCKER-USER, une seule fois.
  "$ipt" -C DOCKER-USER -p tcp -m multiport --dports "$PORTS" -j "$CHAIN" 2>/dev/null \
    || "$ipt" -I DOCKER-USER 1 -p tcp -m multiport --dports "$PORTS" -j "$CHAIN"
  echo "  $(basename "$ipt") : $(wc -l < "$list") plages autorisées, le reste rejeté"
}

apply_from_state() {
  [[ -s "$STATE_V4" ]] || die "aucune liste mémorisée ($STATE_V4) — lancer --apply d'abord"
  build iptables "$STATE_V4"
  # DOCKER-USER en IPv6 n'existe que si le démon gère ip6tables. Si la chaîne est
  # absente, il n'y a rien à filtrer par cette voie : on le dit, on ne prétend pas.
  if [[ -s "$STATE_V6" ]] && ip6tables -L DOCKER-USER -n >/dev/null 2>&1; then
    build ip6tables "$STATE_V6"
  else
    echo "  ip6tables : chaîne DOCKER-USER absente — aucun filtrage IPv6 posé (voir README §6.3)"
  fi
}

case "$MODE" in
  --restore)
    apply_from_state
    ;;

  --apply)
    tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
    fetch https://www.cloudflare.com/ips-v4 "$tmp/v4" 10 '^[0-9.]+/[0-9]{1,2}$'
    fetch https://www.cloudflare.com/ips-v6 "$tmp/v6" 4  '^[0-9a-fA-F:]+/[0-9]{1,3}$'
    install -m 644 "$tmp/v4" "$STATE_V4"
    install -m 644 "$tmp/v6" "$STATE_V6"
    apply_from_state
    ;;

  --check)
    tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
    fetch https://www.cloudflare.com/ips-v4 "$tmp/v4" 10 '^[0-9.]+/[0-9]{1,2}$'
    fetch https://www.cloudflare.com/ips-v6 "$tmp/v6" 4  '^[0-9a-fA-F:]+/[0-9]{1,3}$'
    drift=0
    for f in v4 v6; do
      state="STATE_${f^^}"; state="${!state}"
      if ! diff -q "$tmp/$f" "$state" >/dev/null 2>&1; then
        echo "DÉRIVE ($f) :"
        diff "$state" "$tmp/$f" 2>/dev/null | grep -E '^[<>]' | sed 's/^</  - /; s/^>/  + /'
        drift=1
      fi
    done
    # Une liste à jour mais non appliquée est une illusion de sécurité : on
    # vérifie aussi que la chaîne existe réellement et se termine par un DROP.
    if ! iptables -L "$CHAIN" -n 2>/dev/null | tail -1 | grep -q DROP; then
      echo "DÉRIVE : la chaîne $CHAIN est absente ou ne se termine pas par DROP"
      drift=1
    fi
    if ! iptables -C DOCKER-USER -p tcp -m multiport --dports "$PORTS" -j "$CHAIN" 2>/dev/null; then
      echo "DÉRIVE : $CHAIN n'est pas accrochée dans DOCKER-USER"
      drift=1
    fi
    if (( drift )); then echo "corriger avec : sudo $0 --apply"; exit 1; fi
    echo "à jour — $(wc -l < "$STATE_V4") plages IPv4 appliquées et accrochées dans DOCKER-USER"
    ;;

  *)
    die "mode inconnu : $MODE (attendu --apply, --restore ou --check)"
    ;;
esac
