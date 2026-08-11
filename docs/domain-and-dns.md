# Nom de domaine et zone DNS — P1-17

> Statut : **en cours** — étapes 1 et 2 faites et vérifiées ; SPF et DKIM publiés ; restent la
> validation Mailjet, DMARC, et le pointage vers le VPS (étape 3, attend l'IP)
> Domaine retenu : **`aurelienfeignon.com`** — registraire **Namecheap** (2026-08-11)
> Bloque : P1-15 (déploiement HTTPS), P3-06 (URL canoniques), P10-11 (expédition du CV)
> Dernière mise à jour : 2026-08-11

Ce document est la procédure exécutable de la tâche **P1-17**. C'est un prérequis externe : je ne
peux pas le réaliser à votre place. C'est aussi **la décision la moins réversible du projet** — le
domaine est inscrit dans les URL canoniques, les `hreflang`, les métadonnées de partage et la
signature DKIM. En changer plus tard impose des redirections permanentes et une ré-authentification
complète de l'expédition.

Les étapes 1, 2, 4, 5 et 6 sont réalisables **immédiatement**, sans VPS. Seule l'étape 3 attend
l'adresse IP du serveur.

---

## Étape 1 — Choisir le nom ✅

> **Décision : `aurelienfeignon.com`.** Forme `prenomnom`, sans tiret ni chiffre, extension retenue
> pour deux raisons : `.com` est le suffixe ajouté par défaut de mémoire (prendre `.dev` seul
> laisserait fuir vers `.com` les visiteurs qui retapent le nom, jamais l'inverse), et « point com »
> s'énonce sans épellation au téléphone. Le seul avantage propre de `.dev` — HSTS au niveau du TLD —
> est déjà obtenu en émettant l'en-tête depuis Caddy.
>
> Historique vérifié le 2026-08-11 : `web.archive.org` renvoie `[]` (jamais indexé) pour
> `aurelienfeignon.com`, `.dev` et `.fr`. Aucune réputation héritée.
>
> **Réserve non levée :** `aurélienfeignon.com` (avec accent) est un domaine *distinct* en punycode.
> Un recruteur qui retape le nom à la main écrira spontanément « Aurélien » accentué et n'aboutira
> pas. Risque jugé faible — le domaine circule surtout en lien cliquable (CV, LinkedIn, signature) —
> donc non traité. À reconsidérer seulement si l'usage montre le contraire.

Critères, dans cet ordre :

1. **Prononçable au téléphone et épelable sans hésitation.** Un recruteur le retape à la main.
2. **Court**, sans tiret ni chiffre (un tiret se perd à l'oral, un chiffre pose la question
   « en lettres ou en chiffres ? »).
3. **Extension** : `.dev`, `.fr`, `.com` conviennent. `.dev` impose HSTS au niveau du TLD — donc
   HTTPS obligatoire, ce qui est déjà le cas ici, et c'est un signal correct pour un portfolio
   technique. Éviter les extensions à mauvaise réputation d'expédition (`.xyz`, `.top`, `.click`) :
   elles pèsent négativement sur la délivrabilité du CV.
4. **Vérifier qu'il n'est pas déjà utilisé** par une marque existante, et qu'il n'a pas d'historique
   de spam (un domaine expiré réutilisé peut arriver avec une réputation dégradée).

Forme recommandée : `prenomnom.dev` ou `prenom-nom.fr`. Le nom propre est le seul qui reste juste
quand la stack change.

**Vérification d'historique** avant achat, si le domaine a déjà existé :

```bash
curl -sS "https://web.archive.org/cdx/search/cdx?url=aurelienfeignon.com&limit=5&output=json"
```

Une sortie vide signifie « jamais indexé » — c'est le cas favorable.

## Étape 2 — Acheter et sécuriser

| À faire | Pourquoi |
|---|---|
| Acheter chez un registraire qui **inclut** le renouvellement automatique et la protection WHOIS sans surcoût | Une expiration coupe **simultanément** le site, le certificat HTTPS et l'expédition du CV |
| **Activer le renouvellement automatique** et vérifier que le moyen de paiement enregistré n'expire pas avant | C'est le seul incident de ce projet qui casse tout d'un coup |
| Activer le verrou de transfert (`clientTransferProhibited`) | Empêche un détournement |
| Noter la date d'expiration dans un rappel personnel | Ne pas dépendre du seul e-mail du registraire |

Registraires cohérents avec le reste du projet (prix au renouvellement, pas au premier an) :
Netim, Gandi, OVH, Porkbun, Namecheap, Cloudflare Registrar.

> Cloudflare Registrar impose d'utiliser les serveurs de noms Cloudflare. C'est neutre aujourd'hui,
> et cela anticipe l'hypothèse **H-01b** (CDN en frontal, à trancher en Phase 11). Ce n'est pas une
> raison suffisante de choisir, mais c'est un point en sa faveur.

### Retenu : Namecheap — les quatre réglages à faire dans l'interface

Le domaine est acheté ; ces réglages ne sont **pas tous actifs par défaut** et conditionnent tout le
reste. Onglet **Domain List → Manage** sur `aurelienfeignon.com` :

| Réglage | Où | État attendu |
|---|---|---|
| **Auto-Renew** | onglet *Domain*, en haut | **ON** — à vérifier explicitement, et confirmer qu'une carte non expirée est enregistrée dans *Profile → Payment Methods* |
| **Domain Privacy** (Withheld for Privacy) | onglet *Domain* | **ON** — gratuit à vie chez Namecheap sur `.com` |
| **Registrar Lock** | onglet *Domain* | **ON** — c'est le `clientTransferProhibited` |
| **Nameservers** | onglet *Domain* | **Namecheap BasicDNS** — c'est ce qui donne accès à l'onglet *Advanced DNS* où se font les étapes 3 à 5 |

Deux points propres à Namecheap, utiles pour la suite :

- Le **transfert sortant est bloqué 60 jours** après l'enregistrement (règle ICANN, pas Namecheap).
  Sans effet ici, mais à savoir si l'envie de changer de registraire vient tôt.
- La **redirection d'e-mail est incluse** (onglet *Domain* → section *Redirect Email*). C'est ce qui
  servira à l'étape 5 pour rendre `dmarc@aurelienfeignon.com` joignable. Namecheap crée alors ses
  propres `MX` — donc **ne pas ajouter de `MX` à la main** en plus.

**Vérification :**

```bash
whois aurelienfeignon.com | grep -iE 'expir|status|registrar'
```

## Étape 3 — Pointer le domaine vers le VPS *(attend l'adresse IP)*

| Type | Nom | Valeur | Remarque |
|---|---|---|---|
| `A` | `@` | IPv4 du VPS | Obligatoire |
| `AAAA` | `@` | IPv6 du VPS | Si le VPS en a une — sinon **ne pas créer l'enregistrement** |
| `CNAME` | `www` | `aurelienfeignon.com.` | Caddy redirigera `www` vers l'apex |

Un `AAAA` pointant vers une IPv6 non servie produit des délais de connexion pour une partie des
visiteurs, sans message d'erreur. Mieux vaut aucun enregistrement qu'un enregistrement faux.

**TTL** : 300 s le temps de la mise en place, à remonter à 3600 s une fois stable.

> **Chez Namecheap** — onglet *Advanced DNS* → *Add New Record*. Le champ **Host** attend un nom
> **relatif** : Namecheap y ajoute le domaine tout seul. On saisit donc `@` pour l'apex et `www`
> pour le sous-domaine — jamais `www.aurelienfeignon.com`, qui produirait
> `www.aurelienfeignon.com.aurelienfeignon.com`. Cette règle vaut aussi pour les `TXT` des étapes 4
> et 5 (`mailjet._domainkey`, `_dmarc`).
>
> Le TTL est un menu déroulant dont le défaut est *Automatic* (1800 s) : choisir explicitement
> **300** pendant la mise en place. Namecheap crée par défaut deux enregistrements de parking (un
> `CNAME www` vers `parkingpage.namecheap.com` et une redirection d'URL sur `@`) — **les supprimer**,
> sinon ils entrent en conflit avec les `A`/`CNAME` ci-dessus.

**Vérification** (sans installer `dig`, via DNS-over-HTTPS) :

```bash
curl -sS "https://dns.google/resolve?name=aurelienfeignon.com&type=A" \
  | python3 -c "import json,sys;[print(a['data']) for a in json.load(sys.stdin).get('Answer',[])]"
```

## Étape 4 — Authentifier le domaine chez Mailjet

Dans Mailjet : **Account settings → Sender domains & addresses → Add a sender domain**, puis
renseigner `aurelienfeignon.com`. Mailjet affiche deux enregistrements à publier.

| Type | Nom | Valeur | Source |
|---|---|---|---|
| `TXT` | `@` | `v=spf1 include:spf.mailjet.com ~all` | SPF |
| `TXT` | `mailjet._domainkey` | `k=rsa; p=MIGfMA0...` | **Valeur exacte fournie par Mailjet**, jamais recopiée d'ailleurs |

Puis **valider l'expéditeur** : ajouter `contact@aurelienfeignon.com` comme adresse d'expédition et suivre
la procédure de validation. C'est la valeur par défaut retenue pour la question Q9 (expéditeur
`contact@<domaine>`, adresse de réponse = adresse personnelle).

> ⚠️ **Un seul enregistrement SPF par zone.** C'est l'erreur la plus fréquente et elle invalide
> silencieusement toute la vérification. Si un `v=spf1` existe déjà, il faut **fusionner** :
> `v=spf1 include:spf.mailjet.com include:autre.example ~all`, et non ajouter un second TXT.
>
> *Cas rencontré ici :* la redirection d'e-mail Namecheap publie son propre `include`. La zone porte
> donc **une seule** ligne fusionnée :
> `v=spf1 include:spf.mailjet.com include:spf.efwd.registrar-servers.com ~all`. C'est la forme
> correcte — les deux expéditeurs sont autorisés sans dupliquer l'enregistrement.

### Validation ≠ authentification

Mailjet distingue **deux** choses, et le libellé *Pending* de la liste des domaines ne dit pas
laquelle manque :

| | Ce que c'est | Comment on le constate |
|---|---|---|
| **Validation** | Preuve que le domaine est bien à vous | Colonne *Status* du domaine : `Pending` → `Active` |
| **Authentification** | SPF et DKIM publiés et lus par Mailjet | Écran du domaine (rouage) : deux lignes qui passent au vert |

Publier SPF et DKIM ne fait donc **pas** basculer le statut à `Active` : ce sont deux vérifications
indépendantes. Ouvrir le rouage de la ligne du domaine affiche laquelle des deux reste en attente et
la méthode exacte attendue — c'est cet écran qui fait foi, pas ce document.

> La méthode de validation par **fichier déposé à la racine du site** est inutilisable tant qu'aucun
> serveur ne répond (c'est le cas jusqu'à P1-15). Si Mailjet propose une validation par **e-mail à
> une adresse d'administration** du domaine, c'est la voie praticable aujourd'hui : la redirection
> d'e-mail Namecheap est déjà active, il suffit d'y créer l'alias demandé (`postmaster`, `admin`…)
> pointant vers votre adresse personnelle. Sinon, la méthode par enregistrement `TXT` fonctionne
> aussi et ne dépend de rien.

**Vérification :**

```bash
# Doit renvoyer EXACTEMENT UNE ligne commençant par v=spf1
curl -sS "https://dns.google/resolve?name=aurelienfeignon.com&type=TXT" \
  | python3 -c "import json,sys;[print(a['data']) for a in json.load(sys.stdin).get('Answer',[])]" \
  | grep -c 'v=spf1'

# DKIM
curl -sS "https://dns.google/resolve?name=mailjet._domainkey.aurelienfeignon.com&type=TXT" \
  | python3 -c "import json,sys;[print(a['data']) for a in json.load(sys.stdin).get('Answer',[])]"
```

Puis, dans l'interface Mailjet, les deux lignes doivent afficher un état **validé**. Tant que ce
n'est pas le cas, le CV partira en `dkim=fail` et finira en indésirable (risque **R-19**).

## Étape 5 — Publier DMARC

| Type | Nom | Valeur |
|---|---|---|
| `TXT` | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@aurelienfeignon.com; fo=1; adkim=r; aspf=r` |

`p=none` = **observation seule** : on collecte les rapports sans rejeter quoi que ce soit. Le
durcissement (`p=quarantine`, puis `p=reject`) se fait en Phase 15, après avoir lu des rapports
montrant que tout est aligné. Durcir avant d'avoir mesuré, c'est se couper l'expédition sans le
savoir.

> ⚠️ **L'adresse `rua` doit être sur le domaine lui-même.** Y mettre directement une adresse
> `@gmail.com` demande une autorisation publiée dans la zone `gmail.com` — impossible à créer. La
> solution simple : créer `dmarc@aurelienfeignon.com` en **redirection** vers votre adresse personnelle
> (la plupart des registraires offrent la redirection d'e-mail gratuitement, ce qui nécessite un
> enregistrement `MX`).
>
> **Chez Namecheap** : onglet *Domain* → section *Redirect Email* → alias `dmarc` vers votre adresse
> personnelle. Namecheap publie les `MX` nécessaires lui-même ; ne pas en créer à la main. Puis
> **tester pour de vrai** en s'envoyant un message à `dmarc@aurelienfeignon.com` : une redirection
> configurée mais non reçue est indistinguable d'une redirection absente jusqu'au jour où les
> rapports DMARC manquent.

**Vérification :**

```bash
curl -sS "https://dns.google/resolve?name=_dmarc.aurelienfeignon.com&type=TXT" \
  | python3 -c "import json,sys;[print(a['data']) for a in json.load(sys.stdin).get('Answer',[])]"
```

## Étape 6 — Inscrire le domaine comme valeur unique

Le domaine ne doit **jamais** être recopié en dur dans le code. Il entrera dans la configuration
comme une variable d'environnement unique, consommée par les métadonnées, le sitemap, les
`hreflang` et l'expéditeur :

```bash
SITE_URL=https://aurelienfeignon.com
```

Mise en place effective en P3-06 ; la règle est posée ici pour qu'aucune valeur en dur n'ait le
temps d'apparaître.

---

## Fiche de suivi

C'est la trace exigée par les critères d'acceptation de P1-17. Les lignes ☑ ont été **vérifiées
depuis l'extérieur** (`whois`, DNS-over-HTTPS) le 2026-08-11, et non simplement cochées dans une
interface.

| Élément | Valeur | Fait |
|---|---|---|
| Nom de domaine | `aurelienfeignon.com` | ☑ |
| Registraire | Namecheap (IANA 1068) | ☑ |
| Date d'expiration | **2027-08-11** *(rappel personnel à poser)* | ☑ |
| Renouvellement automatique activé | oui | ☑ |
| Verrou de transfert activé | `clientTransferProhibited` constaté au whois | ☑ |
| Protection WHOIS activée | Withheld for Privacy ehf | ☑ |
| Serveurs de noms | `dns1/dns2.registrar-servers.com` (BasicDNS) | ☑ |
| Enregistrements de parking Namecheap supprimés | `A` → `192.64.119.136` et `CNAME www` → `parkingpage.namecheap.com` **encore en place** | ☐ |
| `A` (et `AAAA` si applicable) vers le VPS | attend l'IP du VPS | ☐ |
| SPF publié — **une seule ligne `v=spf1`** | `v=spf1 include:spf.mailjet.com include:spf.efwd.registrar-servers.com ~all` — fusion correcte avec la redirection d'e-mail Namecheap | ☑ |
| DKIM publié | `mailjet._domainkey`, clé RSA 2048 complète (non tronquée) | ☑ |
| DKIM **validé côté Mailjet** | domaine `portfolio` en état **Pending** | ☐ |
| Expéditeur `contact@<domaine>` validé | | ☐ |
| DMARC publié en `p=none` avec `rua` joignable | `_dmarc` absent de la zone | ☐ |
| Redirection `dmarc@<domaine>` opérationnelle (test réel) | | ☐ |
| `SITE_URL` consigné | | ☐ |

## Ordre conseillé

1. ~~Étape 1~~ — faite (`aurelienfeignon.com`).
2. ~~Étape 2~~ — faite et vérifiée au whois.
3. **Étape 4 — en cours** : SPF et DKIM sont publiés et corrects. Il reste la **validation de
   propriété** côté Mailjet (état *Pending*), puis la validation de l'expéditeur.
4. **Étape 5 — maintenant** : `_dmarc` est absent, c'est le dernier enregistrement à publier avant
   de pouvoir considérer l'expédition authentifiée.
5. Étape 3 — dès que l'IP du VPS est connue (débloque P1-15). Supprimer les enregistrements de
   parking à ce moment-là, pas avant : ils ne gênent rien tant qu'il n'y a pas de serveur.
6. Étape 6 — au moment de P3-06.

## Pièges recensés

| Piège | Conséquence | Parade |
|---|---|---|
| Deux enregistrements `v=spf1` | SPF invalide, **échec silencieux** | Fusionner en une seule ligne |
| Champ *Host* Namecheap rempli en FQDN (`www.aurelienfeignon.com`) | Enregistrement créé sur `www.aurelienfeignon.com.aurelienfeignon.com` — introuvable | Saisir le nom **relatif** : `@`, `www`, `_dmarc`, `mailjet._domainkey` |
| Enregistrements de parking Namecheap laissés en place | Conflit avec les `A`/`CNAME`, le site ne répond pas | Les supprimer dans *Advanced DNS* avant d'ajouter les vrais |
| `MX` ajoutés à la main en plus de *Redirect Email* | Redirection `dmarc@` cassée | Laisser Namecheap gérer les `MX` |
| Valeur DKIM tronquée par l'interface DNS | Signature invalide | Recopier intégralement ; certains panneaux découpent les TXT > 255 caractères en segments — c'est normal et correct |
| `rua` DMARC vers un domaine tiers | Aucun rapport reçu | Adresse sur le domaine, redirigée |
| `AAAA` vers une IPv6 non servie | Lenteurs pour une partie des visiteurs | Ne pas créer l'enregistrement |
| Expiration du domaine | Site, HTTPS et CV coupés simultanément | Renouvellement automatique + rappel personnel |
| Domaine acheté « pour tester », puis changé | Redirections permanentes, ré-authentification DKIM, URL canoniques à migrer | Choisir une fois, sérieusement |
