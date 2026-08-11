# ADR-0007 — Environnement de développement entièrement dockerisé

- **Statut** : ACCEPTÉ (Phase 0, 2026-08-11)
- **Décide** : outillage local, parité d'environnement, exécution des tests
- **Lié à** : ADR-0008 (déploiement)
- **Origine** : demande explicite du 2026-08-11

## Contexte

La machine de développement (WSL2) **n'a pas de Node.js installé**, et il est souhaité qu'elle n'en
ait pas besoin. Par ailleurs, la production sera auto-hébergée sur un VPS (ADR-0008) : la parité
entre le poste de développement, la CI et la production a une valeur directe, puisque c'est moi qui
exploite le serveur et qui subirai toute divergence.

Le projet a par ailleurs des dépendances lourdes et sensibles à l'environnement : binaires natifs
(`sharp`), navigateurs Playwright, chaîne de build Next.js.

## Décision

**Aucun outil Node n'est installé sur l'hôte. Tout s'exécute en conteneur.** L'hôte n'a besoin que
de Docker, de Git et de **GNU Make** *(amendement du 2026-08-11, voir « Révisions » en fin de
document)*.

### Structure de l'image

```text
Dockerfile
├── base     node:<LTS>-bookworm-slim, corepack/pnpm, utilisateur "node"
├── deps     installation depuis le lockfile seul (couche cachée efficacement)
├── dev      outils de développement, CMD "pnpm dev"     ← service "web"
├── build    pnpm build (output "standalone")
└── runner   image de production minimale, non-root      ← artefact déployé (ADR-0008)
```

### Services Compose

| Service | Base | Rôle |
|---|---|---|
| `web` | étage `dev` | Serveur de développement, lint, typecheck, tests unitaires |
| `e2e` | image officielle `mcr.microsoft.com/playwright` | Tests end-to-end, cible `http://web:3000` |

### Règles

1. Le code source est **bind-mounté** ; `node_modules`, `.next` et les caches sont des **volumes
   nommés**, jamais visibles depuis l'hôte (évite l'écrasement par des binaires incompatibles).
2. Le conteneur tourne avec l'**UID/GID de l'hôte**, pour qu'aucun fichier `root` n'apparaisse dans
   le dépôt.
3. La version de Node est définie **en un seul endroit** (argument du Dockerfile), et répliquée
   dans `engines` et dans la CI.
4. Un **Makefile** expose une interface de commandes stable (`make up`, `make test`, `make e2e`,
   `make ci`…), afin que la documentation reste valide même si l'orchestration change.
5. Le projet reste dans le système de fichiers **natif WSL2** (`/home/...`), jamais sous `/mnt/c`,
   pour que la surveillance de fichiers et les entrées/sorties soient utilisables. Le polling est
   un repli documenté, pas un réglage par défaut.
6. **CI** : les gates s'exécutent nativement avec la même version de Node pinnée (rapide, cache
   simple), **plus** un job qui construit l'étage `runner` et démarre le conteneur. Le déclencheur
   pour basculer toute la CI dans l'image est écrit ci-dessous.

## Alternatives considérées

| Alternative | Pourquoi écartée |
|---|---|
| **nvm sur l'hôte** | Le plus simple et le plus rapide au quotidien, mais contraire à la demande explicite, et sans parité avec la production auto-hébergée. |
| **Dev Container (VS Code)** | Excellente ergonomie éditeur, et bâti sur Docker — donc compatible avec cette décision. Écarté comme *base* car cela lierait le projet à un éditeur ; un `devcontainer.json` pourra être **ajouté par-dessus** le Compose existant, sans rien changer. |
| **Nix / devbox** | Reproductibilité supérieure, mais courbe d'apprentissage réelle et aucune parité avec l'image de production, qui restera Docker. Mauvais rapport coût/bénéfice ici. |
| **Toute la CI dans l'image Docker** | Parité maximale, mais CI plus lente (construction d'image, cache de couches à gérer) pour un bénéfice faible tant que la version de Node est pinnée en un point unique. Reste le repli désigné. |
| **Playwright installé dans l'image de dev** | Ajoute des centaines de mégaoctets et des dépendances système à l'image utilisée en permanence, pour un usage ponctuel. Le service séparé est plus propre. |

## Conséquences

**Positives**

- Rien à installer sur l'hôte ; l'environnement est reproductible et jetable.
- Dev et production partagent la même base et la même version de Node : les surprises au
  déploiement diminuent fortement.
- L'étage `runner` est construit et exercé dès la Phase 1 : le déploiement n'est pas découvert en
  fin de projet.
- Onboarding réduit à `git clone && make up`.

**Négatives, assumées**

- Frictions classiques à traiter dès la Phase 1 : permissions de fichiers, hot reload, intégration
  éditeur (le serveur TypeScript de l'IDE ne voit pas `node_modules` du conteneur — traité par un
  Dev Container optionnel ou une installation locale des seuls types).
- Boucle de rétroaction légèrement plus lente qu'en natif (E/S de bind mount).
- Une couche d'abstraction supplémentaire à comprendre lors du diagnostic d'un problème.

**Critère de validation (gate de Phase 1)**

L'environnement n'est accepté que si, depuis un clone neuf : `make up` démarre le site, une
modification de fichier déclenche le hot reload en moins de ~2 s, `make test` et `make e2e` passent,
et aucun fichier appartenant à `root` n'apparaît dans le dépôt.

**Déclencheur de réexamen**

Divergence dev/CI constatée → basculer les gates CI dans l'image. Hot reload inutilisable malgré
les mesures → réévaluer le Dev Container ou une installation hôte.

## Révisions

### 2026-08-11 (Phase 1, P1-02) — GNU Make ajouté aux prérequis d'hôte

**Origine** : constat à l'ouverture de la Phase 1. `make` n'est pas installé sur la machine de
développement et ne fait pas partie de l'installation minimale d'Ubuntu 24.04. La rédaction
initiale (« l'hôte n'a besoin que de Docker et de Git ») était donc incompatible avec la règle 4 du
même ADR, qui fait du `Makefile` l'interface de commandes du projet.

**Décision** : GNU Make devient un prérequis d'hôte explicite, aux côtés de Docker et de Git.

**Justification** : Make n'appartient pas à l'écosystème Node. L'intention de cet ADR — aucune
chaîne d'outillage Node, aucun binaire natif, aucun `node_modules` sur l'hôte — reste
intégralement respectée. L'alternative, un script `./x` en shell POSIX (déjà envisagée dans
`architecture.md` §2.4), supprimerait ce prérequis mais imposerait de réécrire toutes les mentions
`make …` de la documentation pour un gain nul : l'accès au groupe `docker` exige de toute façon une
intervention `sudo` sur l'hôte.

**Conséquences** : `README.md` documente les trois prérequis ; `make doctor` les vérifie. Le repli
vers `./x` reste possible sans dette, le `Makefile` ne contenant que des appels `docker compose`.
</content>
