# ADR-0008 — Auto-hébergement sur VPS, image Docker derrière Caddy

- **Statut** : ACCEPTÉ (Phase 0, 2026-08-11) — remplace l'hypothèse H-01 (Vercel)
- **Décide** : cible de déploiement, reverse proxy, chaîne de livraison, exploitation
- **Lié à** : ADR-0006 (rate limiting), ADR-0007 (environnement dockerisé)
- **Origine** : demande explicite du 2026-08-11

## Contexte

La Phase 0 supposait initialement un hébergement sur Vercel (H-01). La décision est prise
d'**auto-héberger sur un VPS**. Ce n'est pas un détail d'exploitation : cela change le modèle de
disponibilité, la distribution géographique, le modèle de sécurité, et rend possible une
implémentation du rate limiting qui ne l'était pas en serverless.

L'environnement de développement étant déjà dockerisé (ADR-0007), l'artefact de production existe
déjà : l'étage `runner`.

## Décision

1. **Artefact** : image Docker de l'étage `runner`, construite à partir de la sortie `standalone`
   de Next.js, exécutée en **non-root**.
2. **Reverse proxy** : **Caddy** devant l'application. TLS automatique (obtention et
   renouvellement), HTTP/2 et HTTP/3, en-têtes de sécurité, cache long sur les assets immuables.
   L'application n'expose aucun port publiquement ; elle n'est joignable que par le réseau Docker
   interne.
   **Le proxy est une pile indépendante du portfolio** (« edge »), pas un service de sa
   `docker-compose.yml` : le VPS est destiné à héberger d'autres projets (décision du 2026-08-11).
   Le portfolio rejoint un **réseau Docker externe partagé** et déclare son domaine ; il peut être
   redéployé, arrêté ou supprimé sans jamais toucher au TLS des autres projets. Ce découplage coûte
   quelques lignes aujourd'hui et évite une reprise complète au deuxième projet.
3. **Chaîne de livraison** : GitHub Actions → gates verts → construction de l'image → publication
   sur GHCR avec le **tag du SHA de commit** (plus `latest`) → déploiement par SSH
   (`docker compose pull && up -d`). Aucun build sur le VPS.
4. **Rollback** : redémarrer le tag précédent. C'est la raison d'être du tag par SHA.
5. **Rate limiting en mémoire de processus** (ADR-0006), rendu correct par l'instance unique et
   durable ; le plafond journalier global est persisté sur un volume.
6. **Secrets** : fichier d'environnement sur le VPS, permissions `600`, hors dépôt, validé par un
   schéma au démarrage — une variable manquante empêche le démarrage plutôt que de produire des
   erreurs intermittentes.
7. **Distribution** : les pages étant statiques (SSG), un CDN/proxy en frontal est possible et
   recommandé pour compenser l'origine mono-région (H-01b, risque R-16). Décision confirmée sur
   mesure réelle en Phase 11.
8. **Exploitation** : mises à jour de sécurité automatiques, pare-feu fermé par défaut, SSH par clé
   uniquement, healthcheck du conteneur, sonde externe avec alerte, nettoyage périodique des images
   Docker, procédure de restauration **écrite et testée** (Phase 15).

## Alternatives considérées

| Alternative | Pourquoi écartée |
|---|---|
| **Vercel** (hypothèse initiale) | Zéro exploitation, CDN mondial, aperçus de PR. Écarté sur décision explicite. Contreparties abandonnées à assumer : distribution mondiale et exploitation déléguée. Contreparties gagnées : coût maîtrisé, aucune dépendance de plateforme, rate limiting en mémoire réellement viable, maîtrise complète des en-têtes et du cache. |
| **Hébergement statique pur** (export, Nginx seul) | Supprimerait la Server Action, donc l'envoi du CV — fonctionnalité de conversion centrale. Rejeté. |
| **Nginx + certbot** | Équivalent fonctionnel, mais plus de pièces mobiles pour le même résultat, et le renouvellement de certificat devient une tâche à surveiller — c'est-à-dire le risque d'exploitation le plus probable (R-15). |
| **Traefik** | Excellent dès qu'il y a plusieurs services et de la découverte dynamique par étiquettes Docker. Le VPS accueillera d'autres projets, ce qui renforce son intérêt — mais « quelques projets déployés délibérément » n'est pas « découverte dynamique » : un `Caddyfile` où chaque site tient en trois lignes reste plus simple à lire et à dépanner, avec un TLS automatique équivalent. **Déclencheur pour rebasculer** : plus de ~5 services, ou des services dont l'adressage change sans intervention. |
| **Kubernetes / k3s** | Sans rapport avec l'échelle du projet. |
| **Déploiement par `git pull` + build sur le VPS** | Le build consomme la RAM et le CPU du serveur de production (H-01a : 2 Go), n'est pas reproductible, et rend le rollback flou. Rejeté. |
| **Watchtower** (mise à jour automatique d'image) | Déploiement non traçable et non déclenché par les gates. Un déploiement doit être un acte identifiable, rattaché à un commit. |

## Conséquences

**Positives**

- Parité totale dev → CI → production : la même image, la même version de Node.
- Rollback trivial et fiable.
- Maîtrise complète des en-têtes HTTP, du cache et de la politique de sécurité de contenu — utile
  pour le budget de performance et pour l'audit de la Phase 12.
- Le rate limiting en mémoire devient une solution correcte et non un pis-aller (ADR-0006).
- Coût prévisible, aucune dépendance à une plateforme propriétaire.

**Négatives, assumées**

- **L'exploitation m'incombe** (R-15) : disponibilité, sécurité de l'hôte, TLS, disque, supervision.
  C'est le vrai coût de cette décision, et il est permanent.
- **Origine mono-région** (R-16) : le TTFB se dégrade pour les visiteurs éloignés, alors même que
  les Core Web Vitals sont une exigence. D'où la mesure multi-région obligatoire en Phase 11 et le
  CDN en frontal.
- **Point de panne unique** : sans redondance, une panne du VPS est une indisponibilité totale.
  Accepté pour un portfolio ; la supervision garantit au moins de l'apprendre rapidement.
- **L'optimisation d'images consomme mon CPU** : visuels pré-dimensionnés au build et cache
  persistant, sous peine de saturer le serveur.
- Pas d'environnement de préproduction en v1 : le filet est *gates verts + rollback par tag*.

**Déclencheurs de réexamen**

Indisponibilité répétée ou charge d'exploitation subie comme excessive → réévaluer une plateforme
gérée. Trafic international significatif avec TTFB hors budget malgré le CDN → réévaluer la
distribution.

---

## Amendement du 2026-08-14 (P3-06) — l'image est liée à son domaine

**Constat, fait en écrivant les métadonnées.** Toutes les pages de contenu sont statiques
(`architecture.md` §4.2) : leurs `canonical`, leurs `hreflang` et le `sitemap.xml` sont donc écrits
**pendant `next build`**, pas à la requête. `SITE_URL` n'était fournie qu'à l'exécution
(`/srv/portfolio/.env`) : le build n'en disposait pas, et échouait.

Aucune issue ne permet de rester agnostique du domaine :

| Option | Pourquoi elle est écartée |
|---|---|
| URL canoniques relatives | `hreflang` exige des URL absolues ; un `canonical` relatif est toléré mais déconseillé |
| Résoudre l'origine à la requête | Rendrait dynamiques toutes les pages de contenu — or `content/` n'est pas dans l'image (`phase-2-log.md` §9.4) |
| `metadataBase` | Même problème : elle est elle-même fixée au build |

**Décision** — `SITE_URL` devient un **argument de construction** (`ARG` dans l'étage `build` du
Dockerfile), et l'étage `runner` l'inscrit en `ENV` pour que l'image soit auto-descriptive. Elle est
fournie par `docker-compose*.yml` en local et par la variable d'environnement du workflow en CI.
Aucune valeur par défaut : une origine devinée publierait des canoniques vers `localhost`.

**Conséquences**

- **L'artefact n'est plus neutre vis-à-vis du domaine.** Une même image ne peut pas servir deux
  domaines, et changer de domaine impose une **reconstruction**, pas une variable d'exécution. Pour
  un portfolio mono-domaine, c'est sans coût réel ; le noter évite de le redécouvrir.
- Le rollback n'est pas affecté : chaque image porte l'origine avec laquelle elle a été construite.
- ⚠️ **Deux sources pour une même valeur.** `env_file` de Compose l'emporte sur l'`ENV` de l'image :
  si `/srv/portfolio/.env` portait une autre origine, le site servirait des canoniques d'un domaine
  et des liens d'exécution d'un autre. La vérification est portée par la checklist de P4-13, et la
  dette est tracée dans `phase-3-log.md`.
</content>
