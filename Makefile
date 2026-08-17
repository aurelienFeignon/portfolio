# Interface de commandes du projet (ADR-0007 §Règles 4).
#
# C'est la SEULE interface documentée. Aucune commande `pnpm ...` ou `docker ...`
# ne doit être documentée en parallèle : deux interfaces divergent toujours.
#
# Prérequis sur l'hôte : Docker, Git, GNU Make. Node n'est PAS installé et ne
# doit pas l'être.

SHELL := /bin/bash
.DEFAULT_GOAL := help

COMPOSE := docker compose
COMPOSE_PROD := docker compose -f docker-compose.prod.yml
# Exécuté avec l'UID/GID de l'hôte : aucun fichier appartenant à root ne peut
# apparaître dans le dépôt (ADR-0007 §Règles 2).
#
# `id -g` renverrait le groupe *effectif*, qui n'est pas le bon sous `newgrp` ou
# `sg` (il vaut alors `docker`). On lit le groupe primaire déclaré pour
# l'utilisateur : c'est celui qui doit posséder les fichiers du dépôt.
export HOST_UID := $(shell id -u)
export HOST_GID := $(shell id -g $$(id -un))

# Commande ponctuelle dans un conteneur jetable.
RUN := $(COMPOSE) run --rm web

# Points de montage des volumes nommés. Quand ils n'existent pas côté hôte au
# moment du montage, c'est le démon Docker — qui tourne en root — qui les crée :
# deux répertoires appartenant à root apparaissent alors dans le dépôt et ne sont
# plus supprimables sans sudo. Les créer à l'avance, avec la propriété de l'hôte,
# est le seul moyen de l'éviter. Constaté et corrigé en P1-02.
MOUNTPOINTS := node_modules .next

$(MOUNTPOINTS):
	@mkdir -p $@

install up up-d sh typecheck lint format test test-watch coverage bundle: | $(MOUNTPOINTS)

.PHONY: help doctor image install up up-d down sh logs ps reset typecheck lint format e2e \
        build prod-up prod-down e2e-prod bundle ci check-dns check-uptime check-content check-image-size \
        lighthouse \
        test test-watch coverage

help: ## Affiche cette aide
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

doctor: ## Vérifie les prérequis de l'hôte (Docker accessible, versions)
	@echo "→ docker      : $$(docker --version 2>/dev/null || echo 'ABSENT')"
	@echo "→ compose     : $$(docker compose version --short 2>/dev/null || echo 'ABSENT')"
	@daemon=$$(docker info --format '{{.ServerVersion}}' 2>/dev/null | tr -d '\n'); \
	 if [ -n "$$daemon" ]; then \
	   echo "→ daemon      : $$daemon"; \
	 else \
	   echo "→ daemon      : INACCESSIBLE"; \
	   if id -nG | tr ' ' '\n' | grep -qx docker; then \
	     echo "                le démon ne répond pas — est-il démarré ?"; \
	   elif getent group docker | grep -q "[:,]$(USER)\b"; then \
	     echo "                appartenance au groupe docker acquise mais pas encore active :"; \
	     echo "                fermer et rouvrir la session (ou 'newgrp docker')"; \
	   else \
	     echo "                exécuter : sudo usermod -aG docker \$$USER, puis rouvrir la session"; \
	   fi; \
	 fi
	@echo "→ uid:gid     : $(HOST_UID):$(HOST_GID)"
	@echo "→ node (hôte) : $$(node --version 2>/dev/null || echo 'absent — attendu, tout passe par Docker')"

image: ## Construit l'image de développement
	$(COMPOSE) build web

install: ## Installe les dépendances dans le volume node_modules
	$(RUN) pnpm install

lint: ## ESLint + Prettier --check + règles de cloisonnement
	$(RUN) pnpm lint

format: ## Corrige ce qui est corrigeable automatiquement
	$(RUN) pnpm lint:fix

typecheck: ## Vérifie les types (tsc --noEmit), zéro erreur exigée
	$(RUN) pnpm typecheck

test: ## Tests unitaires, d'intégration et de composants
	$(RUN) pnpm test

test-watch: ## Idem, en surveillance continue
	$(RUN) pnpm test:watch

coverage: ## Tests + rapport de couverture, seuils appliqués
	$(RUN) pnpm coverage

e2e: ## Tests end-to-end contre le serveur de développement
	$(COMPOSE) run --rm e2e

build: ## Construit l'image de production (étage runner)
	$(COMPOSE_PROD) build web

prod-up: ## Démarre l'image de production sur http://localhost:3001
	$(COMPOSE_PROD) up -d web

prod-down: ## Arrête l'image de production
	$(COMPOSE_PROD) down

e2e-prod: ## Tests end-to-end contre le BUILD DE PRODUCTION (testing-strategy §8)
	$(COMPOSE_PROD) run --rm e2e

lighthouse: ## Audit Lighthouse contre le BUILD DE PRODUCTION (performance-budget §3)
	$(COMPOSE_PROD) run --rm e2e node scripts/check-lighthouse.mts

check-dns: ## Vérifie la zone DNS et l'authentification d'expédition (P1-17)
	$(RUN) node scripts/check-dns.mts

# La MÊME commande que la sonde planifiée (`.github/workflows/uptime.yml`), et
# non une variante : une sonde qu'on ne peut pas rejouer à la main est un
# mécanisme qu'on ne peut pas instruire le jour où elle crie.
check-uptime: ## Interroge le site EN LIGNE depuis l'extérieur, comme la sonde (P4-14)
	$(RUN) node scripts/check-uptime.mts

check-content: ## Valide tout le contenu Markdown/MDX (CF-10) — inclus dans `build`
	$(RUN) pnpm check-content

bundle: ## Mesure le JS de première visite et applique les budgets
	$(COMPOSE) run --rm -e NODE_ENV=production web \
		sh -c 'pnpm build && pnpm bundle'

# Seuils de `performance-budget.md` §7. Ils sont **ici** et nulle part ailleurs :
# la CI invoque cette cible plutôt que de réécrire la comparaison, faute de quoi
# le chiffre existerait en deux exemplaires — ce que ce même budget reproche à la
# taille d'image de 385 Mo, restée périmée dans quatre documents.
IMAGE_SIZE_TARGET_MO := 250
IMAGE_SIZE_LIMIT_MO  := 400

check-image-size: ## Applique le budget de taille de l'image de production
	@set -eu; \
	 if ! docker image inspect portfolio:local >/dev/null 2>&1; then \
	   echo "  ✗ image portfolio:local absente — lancer 'make build' d'abord."; exit 1; \
	 fi; \
	 bytes="$$(docker image inspect portfolio:local --format '{{.Size}}')"; \
	 mo=$$(( bytes / 1000000 )); \
	 if [ "$$mo" -gt "$(IMAGE_SIZE_LIMIT_MO)" ]; then \
	   echo "  ✗ image de production : $${mo} Mo — au-delà du seuil bloquant de $(IMAGE_SIZE_LIMIT_MO) Mo."; \
	   exit 1; \
	 fi; \
	 if [ "$$mo" -gt "$(IMAGE_SIZE_TARGET_MO)" ]; then \
	   echo "  ⚠ image de production : $${mo} Mo — au-dessus de la cible de $(IMAGE_SIZE_TARGET_MO) Mo, sous le seuil bloquant de $(IMAGE_SIZE_LIMIT_MO) Mo (performance-budget.md §7.1)."; \
	 else \
	   echo "  ✓ image de production : $${mo} Mo, sous la cible de $(IMAGE_SIZE_TARGET_MO) Mo."; \
	 fi

ci: ## Enchaîne tous les gates, dans l'ordre de testing-strategy.md §8
	@set -e; \
	 $(MAKE) image; \
	 $(MAKE) install; \
	 $(MAKE) lint; \
	 $(MAKE) typecheck; \
	 $(MAKE) coverage; \
	 $(MAKE) bundle; \
	 $(MAKE) build; \
	 $(MAKE) check-image-size; \
	 $(MAKE) e2e-prod; \
	 $(MAKE) lighthouse; \
	 $(MAKE) prod-down; \
	 echo; echo "  ✓ Tous les gates sont verts."

up: ## Démarre le serveur de développement sur http://localhost:3000
	$(COMPOSE) up web

up-d: ## Idem, en arrière-plan
	$(COMPOSE) up -d web

down: ## Arrête les conteneurs (les volumes sont conservés)
	$(COMPOSE) down

sh: ## Ouvre un shell dans le conteneur web
	$(RUN) bash

logs: ## Suit les journaux du serveur de développement
	$(COMPOSE) logs -f web

ps: ## État des conteneurs
	$(COMPOSE) ps

reset: ## DESTRUCTIF : supprime conteneurs ET volumes (node_modules, cache Next)
	@echo "Supprime les volumes node_modules, next_cache, pnpm_home."
	@read -p "Confirmer [o/N] ? " ok && [ "$$ok" = "o" ]
	$(COMPOSE) down -v
