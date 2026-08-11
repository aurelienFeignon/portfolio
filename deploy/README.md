# Déploiement

Ce dossier porte la configuration d'exécution sur le VPS (ADR-0008).

| Fichier | Rôle | Tâche |
|---|---|---|
| [`Caddyfile`](./Caddyfile) | Pile « edge » : TLS automatique, en-têtes de sécurité, cache des assets immuables | P1-13 |

Cette procédure n'est **jamais rédigée à l'avance** : chaque section n'apparaît ici qu'une fois
exécutée sur le serveur réel. Une procédure d'exploitation non exécutée est une fiction.

## Ce qui est vérifié

- L'image de production (étage `runner`) se construit, démarre en **non-root**, répond au
  healthcheck et sert le site — vérifié localement via `make build`, `make prod-up`.
- La suite E2E passe **contre cette image**, pas seulement contre le serveur de développement
  (`make e2e-prod`).
- Le `Caddyfile` est validé syntaxiquement par Caddy lui-même.
- **Le VPS est provisionné et durci** — §1 ci-dessous, exécuté le 2026-08-11.

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
/srv/portfolio/     pile applicative (à venir)
```

Les deux piles sont séparées **délibérément** : un `docker compose down` côté portfolio ne doit
jamais emporter le TLS des autres sites hébergés sur ce VPS.

## 2. Ce qui reste à faire (P1-15)

- [ ] **Pare-feu cloud Hetzner** en amont de `ufw` (console Hetzner, hors de portée du dépôt).
- [ ] **DNS** : zone Cloudflare, `A` vers le VPS, en *DNS only* d'abord — voir l'avertissement ci-dessous.
- [ ] **Démarrage de la pile edge** et obtention du certificat Let's Encrypt.
- [ ] Publication de l'image sur **GHCR**, taguée par SHA de commit (dépend de P1-14).
- [ ] **Déploiement déclenché par la CI** ; le VPS ne construit rien.
- [ ] **Rollback exécuté au moins une fois** vers le tag précédent.
- [ ] Consultation des journaux : procédure écrite ici.
- [ ] Fichier d'environnement du portfolio en `600`, hors du dépôt.

> ⚠️ **Ordre imposé par Cloudflare.** Avec le proxy activé (nuage orange), Cloudflare termine le TLS
> et le challenge TLS-ALPN de Caddy échoue. Séquence : enregistrement `A` en **DNS only** → Caddy
> obtient son certificat en HTTP-01 → vérification en HTTPS → **puis** bascule en proxifié avec le
> mode SSL sur **Full (strict)**. Surtout pas « Flexible », qui contredirait le HSTS posé par le
> `Caddyfile`.
>
> La pile edge n'est donc **pas démarrée** tant que le DNS ne pointe pas : Caddy échouerait en
> boucle sur l'ACME et consommerait les quotas d'échec de Let's Encrypt pour rien.
