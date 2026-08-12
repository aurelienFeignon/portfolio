# Déploiement

Ce dossier porte la configuration d'exécution sur le VPS (ADR-0008).

| Fichier | Rôle | Tâche |
|---|---|---|
| [`Caddyfile`](./Caddyfile) | Pile « edge » : TLS automatique, en-têtes de sécurité, cache des assets immuables | P1-13 |
| [`portfolio.compose.yml`](./portfolio.compose.yml) | Pile applicative, copiée en `/srv/portfolio/docker-compose.yml` | P1-15 |
| [`deploy.sh`](./deploy.sh) | Point d'entrée unique de la clé de déploiement de la CI | P1-15 |
| [`sync-cloudflare-origin-firewall.sh`](./sync-cloudflare-origin-firewall.sh) | Restreint 80/443 de l'origine aux plages Cloudflare | P1-15 |

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

### 4.1 Rollback — exécuté le 2026-08-11

Pas une simulation : la production a réellement été ramenée d'un commit au précédent, puis remise à
niveau.

```
19:30:41  rollback vers 306651a2…  (courant : a16b4b7f…)
19:30:50  OK — 306651a2… est sain et sert le site        → 9 secondes
```

**Disponibilité mesurée pendant l'opération** : 26 sondes HTTPS à 0,5 s d'intervalle, **26 réponses
200, aucun échec**. Formulé prudemment : aucune indisponibilité n'a été observée — un intervalle
d'une demi-seconde peut manquer une coupure plus brève.

Deux choses vérifiées à cette occasion, qui ne se devinent pas :

- **Le rollback est symétrique.** Après retour à `306651a2…`, `.tag.previous` contient `a16b4b7f…` :
  le même verbe `rollback` repart donc en avant. Utile quand on est revenu en arrière par précaution
  et qu'on veut annuler ce retour.
- **L'image de destination était déjà locale**, d'où les 9 secondes. C'est exactement ce que protège
  le `docker system prune -f` sans `-a` (§1.1) : avec `-a`, il aurait fallu retélécharger l'image
  depuis GHCR au pire moment.

Remise à niveau ensuite, par le même chemin, en nommant explicitement le tag :

```bash
ssh aurel@<ip> 'SSH_ORIGINAL_COMMAND="deploy <sha40>" /srv/portfolio/deploy.sh'
```

---

## 5. Ce qui reste à faire

P1-15 est **terminé** : les huit critères d'acceptation sont satisfaits, chacun vérifié par une
exécution réelle. Ce qui suit déborde de la tâche et relève des phases ultérieures.

- [ ] **DMARC** : l'enregistrement n'existe pas encore (SPF et DKIM Mailjet, eux, ont survécu à la
      bascule de zone — vérifié).
- [x] **Proxy Cloudflare activé** en *Full (strict)* — 2026-08-12. Vérifié : `cf-ray` présent,
      point de présence **CDG (Paris)**, les quatre en-têtes de sécurité survivent au proxy, et
      `/_next/static` revient en `cf-cache-status: HIT`. Le CDN de H-01b est actif, R-16 compensé.
- [x] **Pare-feu cloud Hetzner** en amont de `ufw` — appliqué le 2026-08-12. Vérifié depuis
      l'extérieur : 22, 80 et 443 répondent, 25 / 2019 / 3000 / 8080 sont filtrés.

---

## 6. Le compte hébergeur fait partie de la surface d'attaque

Tout ce qui précède — SSH par clé, `ufw`, conteneur non-root, secrets en `600` — est **contourné par
la console Hetzner**, qui permet de démarrer la machine en système de secours, de monter le disque
et d'en lire le contenu. Le mot de passe du compte est donc, en pratique, la clé du serveur.

Appliqué le 2026-08-12, et à réauditer en Phase 14 (risque R-22) :

- **2FA (TOTP)** sur le compte, codes de récupération conservés hors du gestionnaire de mots de passe.
- **Protections *delete* et *rebuild*** sur le serveur **et sur l'IP primaire** — perdre l'IPv4
  obligerait à repointer la zone Cloudflare, au pire moment.
- **Aucun jeton d'API** en lecture-écriture dans le projet : un tel jeton permet de supprimer les
  serveurs, et rien dans cette chaîne n'en a besoin.

### 6.1 Le port 22 ne peut pas être restreint à une IP

Le déploiement part des runners GitHub, dont les adresses changent à chaque exécution. Fermer le 22
à tout sauf une IP fixe casserait tous les déploiements. C'est une **conséquence directe** du choix
« déploiement par SSH depuis la CI » (ADR-0008 §5) : le refermer supposerait de changer de
mécanisme — agent tiré depuis le VPS, ou réseau privé — pas d'ajouter une règle.

La mitigation retenue n'est donc pas la fermeture du port, mais le fait que ce port n'ouvre sur
rien : authentification par clé uniquement, `root` refusé, `AllowUsers aurel`, et une clé de CI qui
ne donne pas de shell.

### 6.2 La reprise ne peut pas supposer un serveur neuf

Hetzner restreint par intermittence la **création et le redimensionnement** d'instances, par manque
de capacité et sur sélection aléatoire des clients (avertissement reçu le 2026-08-12). Les serveurs
existants ne sont pas affectés, mais la conséquence est nette pour l'exploitation :

- **Ne pas détruire ni reconstruire ce serveur à la légère** : rien ne garantit de pouvoir le
  recréer. Cela vaut aussi pour toute idée du type « je repars d'une image propre pour tester ma
  procédure de provisionnement ».
- **Les Backups Hetzner sont préférables aux snapshots** ici : ils se restaurent sur le serveur
  existant, sans passer par une création. La valeur de secours d'un snapshot, qui sert surtout à
  fabriquer une nouvelle machine, est entamée par cette restriction.
- Les restrictions étant **par localisation**, une reconstruction reste probable à Falkenstein ou
  Helsinki, au prix d'un changement d'IP — donc d'une modification de la zone Cloudflare.

La procédure de restauration de la Phase 15 (risque R-23) doit être écrite sous cette contrainte, et
non sous l'hypothèse implicite qu'un serveur est disponible à la demande.

### 6.3 L'origine n'accepte que Cloudflare — exécuté le 2026-08-12

Le proxy ne protège que le trafic qui passe par lui. Tant que l'origine répondait à tout le monde,
connaître son IP suffisait à contourner l'absorption DDoS, le cache et toute règle de filtrage
ajoutée chez Cloudflare. Et cette IP **est publique de fait** : la zone a pointé en clair dessus
pendant plusieurs heures (historique DNS), et les scanners indexent les certificats TLS de tout
l'espace IPv4. La cacher est impossible ; refuser ce qui ne vient pas de Cloudflare ne l'est pas.

> ⚠️ **`ufw` ne sert à rien pour cela, et l'erreur a été commise ici avant d'être comprise.**
> Les ports 80 et 443 sont publiés par un conteneur : les paquets atteignent Caddy par
> `FORWARD → DOCKER` et **ne traversent jamais les règles `INPUT` d'`ufw`**. Une règle
> `ufw allow from <cloudflare> to any port 443` est donc inopérante — et pire qu'inutile, puisqu'elle
> affiche un filtrage qui n'existe pas. C'est l'avertissement du §1.1, vérifié à ses dépens.
>
> La seule chaîne évaluée avant les règles de Docker est **`DOCKER-USER`**.

[`sync-cloudflare-origin-firewall.sh`](./sync-cloudflare-origin-firewall.sh) y construit une chaîne
`CF-ORIGIN` : `RETURN` pour chaque plage publiée par Cloudflare, `DROP` en dernier.

| Mode | Rôle |
|---|---|
| `--apply` | récupère les plages, applique, mémorise dans `/srv/edge/.cloudflare-ranges-v{4,6}` |
| `--restore` | réapplique la liste mémorisée, **sans réseau** — c'est ce qui tourne au démarrage |
| `--check` | signale une dérive et sort en 1, sans rien modifier |

Deux unités systemd portent l'automatisme :

- `cloudflare-origin-firewall.service` — `--restore` au démarrage, et `PartOf=docker.service` pour
  couvrir l'autre cas de perte des règles : un redémarrage du démon Docker, qui reconstruit ses
  chaînes.
- `cloudflare-origin-firewall-refresh.timer` — `--apply` chaque lundi 04:30. C'est le **seul** moment
  où l'on va chercher la liste sur le réseau.

> **Pourquoi `--restore` et non `--apply` au démarrage** : si Cloudflare était injoignable à cet
> instant, `--apply` échouerait et l'origine resterait grande ouverte. Une liste d'hier appliquée
> vaut mieux qu'une liste du jour jamais appliquée. Les garde-fous du script vont dans le même
> sens — réponse tronquée, entrée non conforme, moins de 10 plages : il refuse et ne modifie rien.

**Vérifié après un redémarrage réel** (`boot_id` renouvelé) : le contournement direct
(`curl --resolve aurelienfeignon.com:443:<ip>`) **expire sans réponse** sur 80 comme sur 443, le site
répond toujours par Cloudflare, et le challenge ACME atteint encore Caddy — le renouvellement du
certificat n'est donc pas cassé par ce filtrage.

Le port 22 n'est pas concerné : voir §6.1.

**Ce que ce filtrage ne fait pas.** Il rejette au niveau de l'hôte, donc les paquets ont déjà
consommé la bande passante du VPS. Contre une attaque volumétrique, seule une règle **en amont** —
le pare-feu cloud Hetzner — évite la saturation du lien. Restreindre 80/443 aux plages Cloudflare
dans la console Hetzner ajouterait cette couche, au prix d'une resynchronisation manuelle à chaque
évolution des plages, que ce script ne peut pas faire à ta place faute de jeton d'API (R-22).
