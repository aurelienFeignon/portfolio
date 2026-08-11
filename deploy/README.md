# Déploiement

Ce dossier porte la configuration d'exécution sur le VPS (ADR-0008).

| Fichier | Rôle | Tâche |
|---|---|---|
| [`Caddyfile`](./Caddyfile) | Pile « edge » : TLS automatique, en-têtes de sécurité, cache des assets immuables | P1-13 |
| [`portfolio.compose.yml`](./portfolio.compose.yml) | Pile applicative, copiée en `/srv/portfolio/docker-compose.yml` | P1-15 |
| [`deploy.sh`](./deploy.sh) | Point d'entrée unique de la clé de déploiement de la CI | P1-15 |

Cette procédure n'est **jamais rédigée à l'avance** : chaque section n'apparaît ici qu'une fois
exécutée sur le serveur réel. Une procédure d'exploitation non exécutée est une fiction.

## Ce qui est vérifié

- L'image de production (étage `runner`) se construit, démarre en **non-root**, répond au
  healthcheck et sert le site — vérifié localement via `make build`, `make prod-up`.
- La suite E2E passe **contre cette image**, pas seulement contre le serveur de développement
  (`make e2e-prod`).
- Le `Caddyfile` est validé syntaxiquement par Caddy lui-même.
- **Le VPS est provisionné et durci** — §1, exécuté le 2026-08-11.
- **Le site est en ligne en HTTPS** sur <https://aurelienfeignon.com> — §2 et §3, 2026-08-11.

---

## 1. Le serveur

| | |
|---|---|
| Hébergeur | Hetzner Cloud, **CX23** (`debian-4gb-nbg1-1`) |
| Localisation | Nuremberg (NBG1) |
| Ressources | 2 vCPU x86_64 · 3,7 Gio RAM · 38 Go NVMe |
| Système | Debian 13 « trixie », noyau 6.12 |
| Accès | `ssh aurel@<ip>` — clé ed25519 uniquement |

Les ressources dépassent l'hypothèse **H-01a** (2 vCPU / 2 Go). Elle est confirmée, pas seulement
supposée : voir `docs/vision.md`.

### 1.1 Provisionnement — exécuté le 2026-08-11

Le serveur est livré par Hetzner avec `root`, une clé SSH, et rien d'autre : ni pare-feu, ni Docker,
et `PasswordAuthentication` à `yes`.

**Utilisateur non privilégié.** Compte `aurel`, groupe `sudo`, sans mot de passe
(`--disabled-password`) : la frontière de sécurité est la clé SSH, jamais un secret que personne ne
détient. C'est aussi pourquoi `/etc/sudoers.d/90-aurel` porte `NOPASSWD` — une invite de mot de passe
serait sans réponse possible, donc un blocage, pas une protection.

**Durcissement SSH.** Politique dans `/etc/ssh/sshd_config.d/99-hardening.conf`, en drop-in : le
fichier de la distribution reste intact, et la politique du projet se lit d'un seul coup d'œil.

```
PermitRootLogin no          PasswordAuthentication no
PubkeyAuthentication yes    KbdInteractiveAuthentication no
AuthenticationMethods publickey    MaxAuthTries 3
AllowUsers aurel            X11Forwarding no
```

> **Ordre non négociable.** L'accès de remplacement se prouve **avant** de fermer l'ancien : créer
> `aurel`, vérifier `ssh aurel@<ip>` **et** `sudo -n id` sur une connexion neuve, puis seulement
> durcir. Valider par `sshd -t` avant tout rechargement, et utiliser `reload` — jamais `restart` —
> pour ne pas couper la session en cours. Vérifié : `aurel` passe, `root` reçoit
> `Permission denied (publickey)`.

**Pare-feu.** `ufw`, entrant refusé par défaut, sortant autorisé, ouverture de 22, 80 et 443
seulement. `allow` et non `limit` sur le 22 : `limit` bannit au-delà de 6 connexions en 30 s, ce qui
coupe l'accès pendant une session d'administration, et n'apporte rien face à une authentification
exclusivement par clé.

> ⚠️ **`ufw` ne gouverne pas les ports publiés par Docker.** Docker écrit ses propres règles
> `iptables` en amont. Un conteneur qui publie un port est joignable même si `ufw` le refuse. C'est
> sans conséquence ici — seul Caddy publie, sur 80/443, déjà ouverts — mais c'est un piège pour tout
> projet ajouté plus tard sur ce VPS : **ne pas publier de port, rejoindre le réseau `edge`**.

**Mises à jour de sécurité.** `unattended-upgrades`, canal Debian-Security, redémarrage automatique
à 04:00 si un paquet l'exige (`51-portfolio-reboot`). Un correctif de noyau installé mais jamais
activé ne corrige rien ; l'indisponibilité de quelques secondes à 4 h du matin est le prix accepté.

**Docker.** Dépôt officiel `download.docker.com`, dépôt `trixie` vérifié présent avant l'ajout de la
source — pas de repli silencieux vers `bookworm`, qui serait une divergence non signalée. Docker
29.7.2, Compose v5.4.0. `aurel` est dans le groupe `docker`.

**Rotation des journaux** (`/etc/docker/daemon.json`) : `json-file`, 10 Mo × 3 fichiers, au niveau du
démon donc valable pour tout projet futur. Sans cela, un journal de conteneur remplit le disque
(risque R-15).

**Swap** 2 Gio, `vm.swappiness=10`. Non pour compenser un manque de RAM — le conteneur consomme
51 Mo — mais pour qu'un pic ponctuel ne déclenche pas l'OOM killer.

**Purge Docker** hebdomadaire, `docker-prune.timer`, dimanche 03:30.

> `docker system prune -f`, **sans `-a`**. `-a` supprimerait les images taguées inutilisées, c'est-à-dire
> exactement celles vers lesquelles un rollback redémarre. La purge ne prend que les conteneurs
> arrêtés, réseaux orphelins, images sans tag et cache de build.

**Réseau Docker externe partagé** : `docker network create edge` (ADR-0008 §2).

### 1.2 Vérification de persistance

Un redémarrage réel a été effectué, et confirmé par le changement de
`/proc/sys/kernel/random/boot_id` — `uptime` seul ne prouve rien, une extinction en cours se lisant
encore comme une machine debout. Après retour : `ufw` actif, Docker actif et `enabled`, swap monté,
réseau `edge` présent, minuterie de purge active, politique `sshd` inchangée.

### 1.3 Arborescence sur le serveur

```
/srv/edge/          pile « edge », autonome (Caddy, TLS, en-têtes)
  docker-compose.yml    image Caddy épinglée par digest
  Caddyfile             copie de deploy/Caddyfile de ce dépôt
  .env                  SITE_DOMAIN — permissions 600
/srv/portfolio/     pile applicative
  docker-compose.yml    copie de deploy/portfolio.compose.yml
  deploy.sh            copie de deploy/deploy.sh, exécutable par la seule clé de la CI
  .env                  SITE_URL + IMAGE_TAG — permissions 600
  .ghcr-token           jeton read:packages — permissions 600
  .tag.previous         cible du rollback, écrite après chaque déploiement réussi
```

Les deux piles sont séparées **délibérément** : un `docker compose down` côté portfolio ne doit
jamais emporter le TLS des autres sites hébergés sur ce VPS.

---

## 2. DNS et TLS — exécuté le 2026-08-11

Zone gérée par **Cloudflare** (offre gratuite, hypothèse H-01b), domaine déclaré chez Namecheap avec
les serveurs de noms Cloudflare. Deux `A` seulement, apex et `www`, vers l'IP du VPS.

> ⚠️ **Le piège de l'import de zone.** Cloudflare importe les enregistrements existants à la création
> de la zone : il a donc repris les **IP de parking Namecheap**. Tant que le proxy était actif, les
> IP de Cloudflare masquaient le problème — le nom résolvait, mais vers le parking. Vérifier le
> **contenu** des enregistrements, pas seulement que le nom résout.

> ⚠️ **Ordre imposé par Cloudflare pour le certificat.** Avec le proxy activé (nuage orange),
> Cloudflare termine le TLS et le challenge de Caddy échoue. Séquence : `A` en **DNS only** → Caddy
> obtient son certificat → vérification en HTTPS → **puis** bascule en proxifié avec le mode SSL sur
> **Full (strict)**. Jamais « Flexible », qui contredirait le HSTS posé par le `Caddyfile`.

Démarrage de la pile edge une fois — et seulement une fois — le DNS pointé, sans quoi Caddy échoue
en boucle sur l'ACME et consomme les quotas d'échec de Let's Encrypt :

```bash
cd /srv/edge && docker compose up -d
docker compose logs -f caddy      # suivre l'obtention du certificat
```

Résultat vérifié depuis l'extérieur : certificat Let's Encrypt obtenu pour l'apex **et** `www` via
`tls-alpn-01`, `www` redirigé en 301 vers l'apex, HTTP redirigé en 308 vers HTTPS, et les quatre
en-têtes de sécurité présents avec `Server` supprimé.

> **Les en-têtes de sécurité sont absents des réponses d'erreur de Caddy** (un 502 quand la pile
> applicative est à l'arrêt), et `server: Caddy` y réapparaît : le chemin d'erreur court-circuite le
> bloc `header`. Sans conséquence sur les réponses servies, mais à retenir pour l'audit de la
> Phase 14 — un scanner qui interroge le site pendant un redéploiement lira ces en-têtes-là.

---

## 3. Chaîne de livraison — exécuté le 2026-08-11

```
push sur main
   └─▶ CI : gates → E2E contre l'image → publish → deploy
                                            │         │
                    ghcr.io/…/portfolio:<sha>         └─▶ ssh « deploy <sha> »
                                                              └─▶ pull, up -d, attente du healthcheck
```

**Le VPS ne construit rien** : il tire une image déjà publiée et déjà testée.

**Le tag est le SHA de commit, jamais `latest`.** `latest` est poussé par commodité de lecture et
n'est jamais déployé : il change sous les pieds de celui qui le lit, ce qui rend un rollback flou.

### 3.1 La clé de déploiement ne donne pas de shell

Elle est enregistrée dans `authorized_keys` avec `restrict,command="/srv/portfolio/deploy.sh"`. La
demande de la CI arrive dans `SSH_ORIGINAL_COMMAND`, et `deploy.sh` n'accepte que trois verbes :
`deploy <sha40>`, `rollback`, `status`. Vérifié :

```bash
$ ssh -i deploy_key aurel@<ip> 'cat /etc/shadow'
commande refusée: 'cat /etc/shadow'
$ ssh -i deploy_key aurel@<ip> 'deploy latest'
tag invalide: 'latest'
```

L'hôte est **épinglé** par sa clé publique (secret `VPS_HOST_KEY`), relevée puis confrontée à ce que
le serveur déclare lui-même. `StrictHostKeyChecking=no` accepterait n'importe quel serveur répondant
à cette adresse.

### 3.2 Secrets

| Secret GitHub | Contenu |
|---|---|
| `VPS_HOST` / `VPS_USER` | adresse et compte de déploiement |
| `VPS_SSH_KEY` | clé privée dédiée à la CI, distincte de toute clé personnelle |
| `VPS_HOST_KEY` | clé publique d'hôte, épinglée |

Sur le serveur, rien n'est dans le dépôt : `/srv/portfolio/.env` (dont `SITE_URL`, sans laquelle
l'application refuse de démarrer) et `/srv/portfolio/.ghcr-token` sont en `600`.

> Le paquet GHCR est **privé**, d'où le jeton `read:packages` sur le VPS et le `docker login`.
> Docker range l'identifiant en clair (base64) dans `~/.docker/config.json` — il le signale
> lui-même. Rendre le paquet public supprimerait ce secret et son renouvellement, l'image ne
> contenant rien que le dépôt public ne montre déjà.

---

## 4. Exploitation

**Déployer** — automatique à chaque push sur `main`. Aucune action manuelle.

**Consulter l'état** :

```bash
ssh aurel@<ip> 'SSH_ORIGINAL_COMMAND="status" /srv/portfolio/deploy.sh'
```

**Consulter les journaux** :

```bash
ssh aurel@<ip> 'docker compose -f /srv/portfolio/docker-compose.yml logs -f --tail 100 web'
ssh aurel@<ip> 'docker compose -f /srv/edge/docker-compose.yml logs -f --tail 100 caddy'
```

Rotation assurée par le démon (`json-file`, 10 Mo × 3) : inutile de purger à la main.

**Revenir en arrière** — la CI ne sait que déployer en avant ; le rollback se déclenche à la main
depuis un poste dont la clé personnelle est autorisée :

```bash
ssh aurel@<ip> 'SSH_ORIGINAL_COMMAND="rollback" /srv/portfolio/deploy.sh'
```

Il n'y a **pas de rollback automatique du site** au sens d'un retour à un état antérieur choisi :
`deploy.sh` revient tout seul au tag précédent **uniquement** si le déploiement qu'il vient de
lancer n'atteint pas l'état `healthy`. Le tag précédent n'est enregistré qu'après un succès — sinon
un déploiement raté écraserait la seule cible de retour connue.

---

## 5. Ce qui reste à faire (P1-15)

- [ ] **Rollback exécuté au moins une fois** vers le tag précédent, et consigné ici.
- [ ] **Bascule du proxy Cloudflare** en orange avec SSL en *Full (strict)*, une fois le certificat
      d'origine en place — c'est l'étape qui active réellement le CDN de H-01b.
- [ ] **Pare-feu cloud Hetzner** en amont de `ufw` (console Hetzner, hors de portée du dépôt).
- [ ] **DMARC** : l'enregistrement n'existe pas encore (SPF et DKIM Mailjet, eux, ont survécu à la
      bascule de zone — vérifié).
