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

> ⚠️ **`SITE_URL` est désormais fixée à la construction, et l'image la porte** (Phase 3,
> [ADR-0008](../docs/adr/0008-self-hosted-vps-deployment.md) amendé). Les pages de contenu étant
> statiques, leurs `canonical`, leurs `hreflang` et le `sitemap.xml` sont **gravés dans le HTML** au
> moment du `docker build` — la CI la fournit en argument de construction, et l'étage `runner`
> l'inscrit en `ENV`.
>
> Conséquences pour l'exploitation :
>
> - **Un changement de domaine impose une reconstruction**, pas une modification du `.env`.
> - **`env_file` de Compose l'emporte sur l'`ENV` de l'image.** Si `/srv/portfolio/.env` portait une
>   autre origine, le site servirait des canoniques d'un domaine et des liens d'exécution d'un autre
>   — sans que rien n'échoue. Les deux valeurs doivent coïncider ; c'est un point de la checklist de
>   P4-15.
>
> Vérifier la valeur réellement servie :
>
> ```bash
> curl -s https://aurelienfeignon.com/fr | grep -o '<link rel="canonical"[^>]*>'
> ```

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

⛔⛔ **Ce relevé est PÉRIMÉ depuis le 2026-08-12, sans avoir jamais été faux — voir §4.3.** Il a été
pris quand le proxy Cloudflare était en *DNS only* : une 200 venait alors de l'origine. Depuis la
bascule en *Full (strict)*, elle peut venir de la périphérie, et le même geste rendrait 26 verts sur
un site mort. Le rejeu du 2026-08-18, jugé sur le corps, observe **~1 s d'origine absente**.

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

## 4.2 Le site est volontairement fermé au public

Depuis le 2026-08-15, `aurelienfeignon.com` est derrière **Cloudflare Access**, avec authentification
**OTP par e-mail**, et le restera **tant que le portfolio n'est pas terminé**. Décision de
l'utilisateur : le site est déployé et fonctionne, il n'est simplement pas encore montrable.

⚠️ **Conséquence pour tout diagnostic.** Une requête anonyme sur n'importe quelle URL renvoie une
redirection 302 vers `augure.cloudflareaccess.com/cdn-cgi/access/login/…`. Cela **ressemble** à une
panne de déploiement ou à une zone DNS cassée, et ce n'en est pas une. Ce qui fait foi est la
conclusion du workflow CI sur `main` — les jobs « publier l'image sur GHCR » et « déployer sur le
VPS » :

```bash
gh run list --branch main --limit 1
```

⚠️ **Conséquence pour P4-16.** La vérification post-déploiement — indexation, `canonical`,
`hreflang`, `sitemap.xml`, `robots.txt` observés depuis l'extérieur — est **impossible tant
qu'Access est actif**, et aucun moteur de recherche n'atteint le site. Lever Access fait donc partie
de la mise en ligne réelle, au même titre que le déploiement lui-même.

✅ **La réserve sur le `robots.txt` managé est tranchée — 2026-08-17, P4-14.** Elle était fondée :
Cloudflare servait ses seuls « Content Signals », **en 200**, sans la directive `Sitemap:` de
l'application. Le sitemap n'était donc annoncé à personne. Depuis l'application Access en **Bypass**
sur `/robots.txt` (§7.2), Cloudflare **fusionne** au lieu de remplacer — ses signaux, puis le fichier
de l'origine. Mesuré des deux côtés, avant et après.

---

⭐ **Access a été levé temporairement le 2026-08-20**, à la demande de l'exploitant, le temps
d'exécuter P4-16 (§9). Le site a été **réellement public** pendant cette fenêtre. La fermeture reste
la règle jusqu'à la fin du portfolio ; la vérification, elle, ne pouvait pas être faite autrement —
c'est écrit ici depuis le 2026-08-15.

---

## 4.3 Le même rollback rejoué — exécuté le 2026-08-18 (P4-15)

Rejoué pour deux raisons. La première est le critère de sortie de la Phase 4 : *rollback prouvé*. La
seconde n'était pas prévue — **la preuve du §4.1 ne peut plus être refaite par ses propres moyens.**

Elle a été prise le 2026-08-11, quand le proxy Cloudflare était encore en *DNS only* : une 200 venait
alors **de l'origine**, et « 26 sondes HTTPS, aucun échec » disait bien ce qu'elle avait l'air de
dire. Le passage en *Full (strict)* le 2026-08-12 (§5) a changé ce que ce critère **signifie** :
depuis, Cloudflare peut composer la réponse à sa périphérie, et le §7.4 l'a mesuré. La preuve n'est
pas fausse — elle est **périmée**, et refaire le même geste aujourd'hui donnerait un vert qui ne
prouve rien.

Le rejeu est donc jugé sur le corps, comme la sonde : c'est **la sonde elle-même** qui a mesuré, mise
en boucle dans un conteneur unique (`UPTIME_RETRY_DELAY_MS=0`), soit ~5 à 6 verdicts par seconde
contre un échantillon toutes les 0,5 s en 2026-08-11.

| | Aller `4084cd50…` → `daffa6de…` | Retour `daffa6de…` → `4084cd50…` |
|---|---|---|
| Verbe | `rollback` | `rollback` — **le même** |
| Durée rendue par `deploy.sh` | 10 s (06:46:11 → 06:46:21 UTC) | 9 s (06:47:55 → 06:48:04 UTC) |
| Origine absente, observée | **~1 s** (4 verdicts rouges à 06:46:14) | **aucune** — 294 verdicts, 0 rouge |

⛔⛔⛔ **Pendant cette seconde, le statut est resté 200.** Le corps servi était celui de Cloudflare
(« *As a condition of accessing this website…* »), la directive `Sitemap:` absente. Un contrôle jugé
sur le code de retour aurait rapporté **zéro indisponibilité sur une origine absente** — sur une
opération d'exploitation normale, cette fois, et non sur un arrêt provoqué comme au §7.4.

⭐⭐ **La symétrie du §4.1 est reconfirmée, et c'est elle qui a servi au retour** : après l'aller,
`.tag.previous` contenait le tag qu'on venait de quitter, et le **même verbe** a ramené la production
à `4084cd50…`. L'état final est identique à l'état initial, `status` à l'appui.

⚠️ **Deux réserves, non levées.** La coupure n'est **pas déterministe** : visible à l'aller, absente
au retour, et la raison n'est pas établie. Et au retour, une requête a mis ~1,5 s avant de revenir
**verte**, laissant un trou d'échantillonnage à 06:47:58 — la couverture n'est donc pas continue, et
une coupure plus brève que l'intervalle reste possible aux deux passages. C'est la même prudence que
le §4.1, à une cadence dix fois plus fine.

⭐ **La cible de retour était locale** (`docker images` : image `daffa6de…` présente depuis 19 h),
d'où les 10 s. C'est exactement ce que protège le `docker system prune -f` sans `-a` (§1.1) — à
vérifier **avant** de déclencher, la checklist du §8 le demande.

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

---

## 7. Supervision — exécuté le 2026-08-17 (P4-14, risque R-15)

L'image porte un `HEALTHCHECK` depuis P1-13, et `deploy.sh` l'attend avant de déclarer un
déploiement réussi. Il interroge `http://127.0.0.1:3000/` **depuis l'intérieur du conteneur** : il ne
dit donc rien de la zone DNS, du proxy Cloudflare, de Caddy, du réseau `edge`, ni du fait que la
machine soit allumée. **Un VPS éteint a un healthcheck parfaitement silencieux.**

| Pièce | Où elle vit |
|---|---|
| La sonde | [`scripts/check-uptime.mts`](../scripts/check-uptime.mts) — rejouable à la main par `make check-uptime` |
| Sa planification | [`.github/workflows/uptime.yml`](../.github/workflows/uptime.yml) — toutes les 10 min, plus `workflow_dispatch` |
| Son banc | `tests/integration/uptime-probe.test.ts` — 15 cas, chacun une panne observable |

### 7.1 Ce que la sonde regarde, et pourquoi le statut ne suffit pas

Elle interroge `https://aurelienfeignon.com/robots.txt` et exige **deux** choses : une **200 sans
suivre les redirections**, et la directive `Sitemap:` portant l'origine de production **dans le corps
servi**.

⛔⛔⛔ **Le second contrôle est tout le travail, et c'est mesuré** — arrêt volontaire du conteneur,
2026-08-17 :

| État du site | Statut rendu | Directive `Sitemap:` |
|---|---|---|
| debout | **200** | **présente** |
| **arrêté** | **200 quand même** | **absente** |

Cloudflare **compose la réponse à sa périphérie** : origine vivante, il lui ajoute ses signaux ;
origine morte, il sert ses signaux **seuls**, toujours en 200. ⭐⭐ Une sonde jugée sur le code HTTP
aurait donc été **verte sur un site éteint** — c'est-à-dire exactement la panne que R-15 décrit.

⚠️ **Conséquence pour qui reprendra ce code** : retirer le contrôle du corps en « simplifiant »
rendrait la sonde décorative sans rien faire rougir. Le banc le tient avec le corps managé
réellement observé pendant l'arrêt.

### 7.2 L'application Access qui rend la sonde possible

Le site est fermé au public (§4.2) : une requête anonyme reçoit une 302 **produite par Cloudflare**,
donc verte même conteneur arrêté. Une application Access dédiée ouvre le seul chemin sondé.

| Champ | Valeur |
|---|---|
| Type | Self-hosted |
| Nom | `portfolio — robots.txt (sonde)` |
| Hostname / Path | `aurelienfeignon.com` / `robots.txt` |
| Politique | **Bypass**, Include **Everyone** |

L'application la plus spécifique l'emporte sur celle qui couvre `aurelienfeignon.com/*`. **Vérifié
le 2026-08-17** : `/robots.txt` rend 200, tandis que `/`, `/fr`, `/sitemap.xml` et `/fr/skills`
rendent toujours 302 vers `cloudflareaccess.com`. Le reste du site n'a pas bougé.

### 7.3 Quand l'alerte crie

L'alerte est **l'e-mail d'échec de GitHub Actions**, pas un service de plus. Deux conditions à
connaître, parce qu'elles se perdent sans rien casser :

- le réglage *GitHub → Settings → Notifications → Actions → Email* doit être actif ;
- ⚠️ **la notification part vers le compte qui a créé ou modifié en dernier la ligne `cron`.** Si
  quelqu'un d'autre y touche, les alertes le suivent.

Le message d'échec nomme lui-même quoi regarder, dans cet ordre — les trois commandes sont au §4 :

1. **l'état de la pile** — `status` dit si le conteneur tourne et sur quel tag ;
2. **les journaux** du service `web`, puis ceux de `caddy` si `web` est sain ;
3. **le retour arrière** — `rollback` ramène au tag précédent, mesuré à 9 s en P1-15.

⭐ La sonde rejoue à la main par `make check-uptime` — **le même script, le même argument**, dans le
conteneur de développement au lieu du runner. Un mécanisme d'alerte qu'on ne peut pas rejouer est un
mécanisme qu'on ne peut pas instruire le jour où il crie.

### 7.4 L'arrêt volontaire — exécuté le 2026-08-17

Pas une simulation : le conteneur de production a réellement été arrêté, la sonde a été lancée
**depuis GitHub**, et le site remis debout. 58 secondes d'indisponibilité, aucun visiteur — le site
est fermé au public.

```text
11:57:22Z   sonde (site sain)      → succès en 16 s
11:57:51Z   docker compose stop web → portfolio-web-1  Exited (143)
11:57:54Z   sonde                   → ÉCHEC en 27 s
              ✗ tentative 1/2 : 200, mais la directive « Sitemap: … » est absente
              ✗ tentative 2/2 : idem                    ← les deux tentatives, puis l'alerte
11:58:49Z   docker compose start web → Up 6 seconds (healthy)
11:58:51Z   sonde                   → succès en 13 s
```

⭐ **Le journal du run porte la consigne de dépannage** : l'opérateur qui ouvre l'alerte y lit les
trois commandes du §7.3 sans avoir à ouvrir ce fichier.

⚠️ **Le premier tir planifié n'est pas tombé à l'heure ronde**, et c'est la propriété annoncée au
§7.5, observée dès le premier jour : la planification d'Actions est « au mieux ». Ce que la sonde
garantit est *« une panne ne dure pas des jours »*, pas *« une panne est vue en dix minutes »*.

### 7.4 bis L'alerte est **reçue** — confirmé le 2026-08-17

L'e-mail d'échec de GitHub Actions est arrivé pour le run rouge de 11:57:54Z. C'est la seule pièce
que le dépôt ne peut pas prouver seul : elle dépend d'un réglage du compte (§7.3), hors du dépôt.

⚠️ **Le jour où une panne passe inaperçue, c'est là qu'il faut regarder d'abord** — *GitHub →
Settings → Notifications → Actions* —, et non dans la sonde : elle, son code de sortie et son journal
disent ce qu'ils voient.

### 7.5 Ce que cette sonde n'est pas

⚠️ **Elle partage une plateforme avec la chaîne de déploiement.** Une panne de GitHub la rend
**muette, pas rouge**. C'est l'arbitrage du 2026-08-17 : une sonde versionnée, relisable en revue et
sans compte tiers, contre l'indépendance totale d'un service extérieur.
*Ce qui rouvrirait la question* : une panne réelle que la sonde n'aurait pas signalée, ou une mise en
ligne au public — à ce moment, une sonde tierce gratuite (5 min, alerte e-mail et SMS) devient
justifiée par l'audience.

⚠️ **La planification d'Actions est « au mieux »** : GitHub retarde ou saute des exécutions sous
charge, et désactive un `cron` après **60 jours sans activité** sur le dépôt. La résolution réelle
est donc « 10 minutes plus un retard non garanti », ce qui reste très au-dessous du risque visé —
une panne durant des **jours** sans être vue.

⚠️ **Aucun relevé d'expiration de certificat, et ce n'est pas un oubli.** Le site étant proxifié, le
certificat vu de l'extérieur est celui de **Cloudflare**, qu'il renouvelle seul : en mesurer les
jours restants promettrait « TLS surveillé » en observant ce qui ne peut pas casser. Le certificat
qui peut réellement expirer est celui de **Caddy sur l'origine** ; en mode *Full (strict)*, son
expiration fait répondre Cloudflare en **526**, que la sonde nomme explicitement. Le relevé TLS est
donc pris au bon endroit.

⚠️ **Ce qu'elle ne surveille pas du tout** : le disque, la mémoire, les mises à jour de sécurité, la
dérive du pare-feu `CF-ORIGIN` (§6.3, `--check` sort en 1). Ce sont d'autres moitiés de R-15, et
elles relèvent de la Phase 15 — les nommer ici évite de croire le risque couvert.

---

## 8. Checklist de mise en ligne — P4-15

Écrite **après exécution**, comme le §4.1 : chacun de ses points a été joué le 2026-08-18, la moitié
« déployer » par la fusion de la PR #33 (06:34 UTC) et la moitié « revenir » par l'aller-retour du
§4.3. La Phase 15 la réutilise plutôt que d'en écrire une seconde.

Les commandes distantes emploient l'alias `portfolio` du `~/.ssh/config` de l'exploitant — c'est
le même hôte que le `aurel@<ip>` des sections précédentes, écrit sous la forme qui a réellement servi.

⛔ **La règle qui gouverne toute la liste** : ne juger aucune étape sur un code de retour. Un CDN est
interposé, et il répond à la place de l'origine — mesuré deux fois (§7.4, §4.3). Ce qui fait foi est
la conclusion du workflow d'un côté, la sonde de l'autre.

### 8.1 Avant

- [ ] **La CI de la PR est verte** — trois jobs seulement (`versions de référence`,
      `lint · typecheck · tests · budget de bundle`, `image de production · end-to-end`).
      ⛔ `publier l'image sur GHCR` et `déployer sur le VPS` sont gardés par
      `github.event_name == 'push' && github.ref == 'refs/heads/main'` : **ils n'existent pas avant
      la fusion**, et le dernier run de `main` parle du commit précédent, pas du vôtre. Les cinq
      jobs se vérifient au §8.3, jamais ici.
- [ ] **Relever l'état courant** :
      `ssh portfolio 'SSH_ORIGINAL_COMMAND="status" /srv/portfolio/deploy.sh'`.
      **Noter le tag courant** — c'est la cible de retour, et `deploy.sh` ne l'enregistre qu'après un
      déploiement réussi.
- [ ] **L'image de la cible de retour est encore locale** sur le VPS
      (`docker images ghcr.io/aurelienfeignon/portfolio`). Sinon le rollback devra la retélécharger,
      au pire moment (§1.1).
- [ ] **La sonde est verte avant de commencer** : `make check-uptime`. Partir d'un rouge inconnu rend
      tout le reste illisible.
- [ ] **La clé personnelle est déverrouillée** : `ssh-add -l`. Sans agent, `BatchMode=yes` rend
      `Permission denied (publickey)` pour une clé verrouillée **comme** pour une clé non autorisée —
      deux causes, un seul message.

### 8.2 Pendant

- [ ] Le déploiement part **tout seul** à la fusion sur `main`. Aucune action manuelle, aucun
      `deploy` à la main : le tag doit désigner un état exact du dépôt.
- [ ] Suivre jusqu'à la conclusion : `gh run watch <id> --exit-status`.

### 8.3 Après

- [ ] **`make check-uptime` → vert.** C'est le seul contrôle qui distingue une origine vivante d'une
      réponse composée par Cloudflare.
- [ ] **`status`** : tag courant = le SHA attendu, conteneur `(healthy)`, tag précédent = celui noté
      au §8.1.
- [ ] **`SITE_URL` coïncide dans ses trois écritures** — `ENV` de l'image, `.env` du VPS lu par
      Compose, `Config.Env` du conteneur. L'`env_file` **l'emporte** sur l'`ENV` de l'image : une
      divergence ferait servir des canoniques d'un domaine et des liens d'exécution d'un autre, sans
      que rien n'échoue (§3.2).
- [ ] **Ce qui a changé est servi** — et vérifié sur le document servi, pas sur ces trois variables :
      elles peuvent coïncider pendant qu'un HTML gravé au build dit autre chose (P4-13). C'est le
      `canonical` du document qui tranche.
- [ ] **Si le site est ouvert au public** : `make check-public-seo` → vert. Il lit `robots.txt`, le
      sitemap et **chaque page qu'il annonce**, et compare `canonical`, `lang` et `hreflang` à ce que
      le sitemap déclare (§9). ⚠️ Derrière Access, il rend une erreur qui **nomme** la fermeture — ce
      n'est pas un défaut, et c'est pourquoi il n'est pas un gate de CI.
- [ ] **Les cinq jobs du run de `main` ont conclu** — `déployer sur le VPS` compris :
      `gh run watch <id> --exit-status`, ou `gh run list --branch main --limit 1`. Le vert de GHCR
      ne dit rien du VPS.
- [ ] **Un tir PLANIFIÉ de la sonde est passé vert** depuis le déploiement :
      `gh run list --workflow "Sonde externe" --event schedule --limit 1`. ⛔ Sans `--event
      schedule`, un `workflow_dispatch` déclenché à la main coche la case sans rien prouver — or ce
      qu'on veut savoir est que le **`cron` est vivant**, et il ne s'exécute que depuis la branche
      par défaut.

### 8.4 Si ça tourne mal

- [ ] **Ne pas doubler la manœuvre** : si le conteneur n'atteint pas `healthy` en 120 s, `deploy.sh`
      remet **de lui-même** le tag qui servait avant la tentative, et sort en 1. Lire son journal
      avant d'agir.
- [ ] ⛔⛔ **Après un retour AUTOMATIQUE, ne pas enchaîner un `rollback` à la main.**
      `.tag.previous` n'est écrit **qu'après un succès** : il porte donc encore la version
      d'**avant** celle qui servait, et un `rollback` reculerait de **deux** versions. Le vérifier
      par `status` avant tout geste — c'est aussi ce qui protège la seule cible de retour connue
      d'être écrasée par un déploiement raté.
- [ ] Sinon, revenir à la main :
      `ssh portfolio 'SSH_ORIGINAL_COMMAND="rollback" /srv/portfolio/deploy.sh'`.
      Compter **~10 s**, dont **~1 s d'origine absente** sous un statut 200 constant (§4.3).
- [ ] **Le verbe est symétrique** : le relancer repart en avant. Un retour par précaution s'annule
      donc par le même geste, `status` à l'appui.
- [ ] **Juger le retour par la sonde**, jamais par un `curl` ni par un statut.

### 8.5 Ce que cette checklist ne couvre pas

Nommé pour ne pas croire le sujet couvert :

- **La vérification depuis l'extérieur** — indexation, `canonical`, `hreflang`, `sitemap.xml`
  observés par un visiteur anonyme — est **P4-16**, et suppose de lever Cloudflare Access (§4.2).
- **Il n'y a pas de bascule sans coupure.** `docker compose up -d web` recrée le conteneur ; la
  seconde d'absence du §4.3 est le prix de cette simplicité, et l'éliminer demanderait deux
  conteneurs et une bascule côté Caddy. Assumé tant que le site n'a pas d'audience.
- **DMARC** n'est toujours pas publié (§5).

⚠️ **Et ce qu'il ne faut pas croire couvert par un déploiement réussi** : `content/` **est** dans
l'image de production (87 fichiers, le traceur de Next l'inclut dans la sortie `standalone`), ce que
quatre documents ont nié pendant quatre phases. L'exigence « aucune route ne se rend à la demande »
tient toujours, mais ce qui la protège est **`check-static-rendering.mts`, et lui seul** — un gate de
la CI, pas une propriété de l'image. Aucune étape de cette checklist ne le remplace.

---

## 9. Vérification post-déploiement — exécutée le 2026-08-20 (P4-16)

Ce que le site annonce à un robot, constaté **depuis l'extérieur**, Access levé. Rejouable par
`make check-public-seo` (`scripts/check-public-seo.mts` ; l'origine passe par argument).

| Contrôle | Relevé |
|---|---|
| `robots.txt` | `User-Agent: *` / `Allow: /`, et `Sitemap:` déclaré. Le bloc managé de Cloudflare le **précède** et bloque GPTBot et meta-externalagent — il **fusionne**, il ne remplace plus (§7.2) |
| `sitemap.xml` | **14 URL**, toutes sur l'origine de production, chacune avec ses trois `hreflang` |
| Les 14 pages | 200, `<html lang>` conforme au segment d'URL, `canonical` **égal à l'URL du sitemap**, et hreflang **identiques** à ceux du sitemap — **0 écart sur 14** |
| 404 | `/fr/inexistant`, `/en/inexistant`, `/inexistant` et **`/_next/inexistant`** rendent 404 avec un `lang` et un `noindex`. Le plancher `globalNotFound` de P4-10 tient en production |
| En-têtes | HSTS `max-age=31536000; includeSubDomains`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`. Aucun `x-robots-tag` ne contredit l'indexation |
| Lighthouse **contre le site réel** | accessibilité **100**, SEO **100**, bonnes pratiques **100**, performance **98 mobile / 100 desktop** (mobile+desktop, accueil et fiche) |

⭐⭐ **« Bonnes pratiques » vaut 100 ici et 78 en local**, et c'est la même page : `is-on-https` et
`redirects-http` ne peuvent passer que sur une origine en HTTPS. C'est exactement ce que P4-13 avait
renvoyé à cette tâche — *l'audit local juge l'artefact, celui-ci juge le service*.

⛔⛔ **Deux instruments ont menti avant que quoi que ce soit ne soit vérifié.** La première lecture
des `hreflang` était sensible à la casse et rendait « aucun hreflang » sur quatorze pages qui en
portent trois : Next sert `hrefLang` avec un L majuscule, valide en HTML. Et `check-lighthouse.mts`
imprimait « contre l'image de production » et « ce banc sert du HTTP nu » **pendant qu'il auditait le
site en HTTPS** — sa prose était constante, sa cible ne l'est pas. Les deux sont corrigés ; le second
dérive maintenant son texte de l'adresse qu'il interroge.

✅ **Le mode d'échec de l'outil est vérifié en production, le 2026-08-20** : Access refermé,
`make check-public-seo` sort en 1 sur *« 302 vers Cloudflare Access — le site est FERMÉ au public. Ce
n'est pas un défaut »*, tandis que `make check-uptime` reste **verte** — le Bypass sur `/robots.txt`
survit à la fermeture. Les deux sondes disent donc des choses différentes, et chacune la sienne.

⚠️ **Ce que cette vérification ne dit pas** : rien sur l'indexation *effective* — aucun moteur n'a
été sollicité, aucune Search Console n'est déclarée. Elle établit que le site est **indexable** et
qu'il est **cohérent avec lui-même**, ce qui est la partie que le dépôt peut tenir.
