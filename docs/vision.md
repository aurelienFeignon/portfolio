# Vision — Portfolio développeur interactif

> Statut : **Phase 0 — en revue**
> Dernière mise à jour : 2026-08-11

---

## 1. Reformulation de la vision

### 1.1 En une phrase

Un portfolio professionnel de développeur Full-Stack qui est **d'abord un site documentaire
solide** (serveur, indexable, accessible, bilingue), et **ensuite** une expérience immersive 3D
qui donne au visiteur l'impression de s'asseoir devant mon poste de travail réel.

### 1.2 Ce que le produit est

- Un **site de contenu** : expériences professionnelles, projets, compétences, rédigés en
  Markdown/MDX, versionnés avec le code, disponibles en français et en anglais.
- Une **couche de navigation spatiale** : une scène Three.js représentant un bureau à trois
  écrans, où chaque écran est une porte d'entrée vers une section du portfolio.
- Un **outil de conversion** : le visiteur (recruteur, CTO, client) doit pouvoir, en moins de
  deux minutes, comprendre qui je suis, voir une preuve de compétence, et repartir avec mon CV
  dans sa boîte mail.

### 1.3 Ce que le produit n'est pas

- Ce n'est **pas un jeu vidéo**. La 3D sert la lecture du contenu, elle ne la remplace pas.
- Ce n'est **pas une démo technique WebGL**. Aucune information ne vit exclusivement dans la
  scène.
- Ce n'est **pas un CMS**. Le contenu est du fichier, pas de la base de données.

### 1.4 Le principe directeur, non négociable

> **La scène 3D est une projection du contenu, jamais sa source.**

Concrètement, si l'on supprime entièrement le dossier de la couche immersive, il doit rester un
portfolio complet, navigable, indexable et accessible. C'est le critère de sortie de la Phase 4,
et c'est la garantie structurelle qui protège le SEO, l'accessibilité et le mobile.

### 1.5 Métaphore de navigation

```text
                     ┌──────────────┐
                     │   Bureau     │
                     └──────┬───────┘
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
  Écran gauche        Écran central        Écran droit
  Expériences           Projets            Compétences
  /{loc}/experiences  /{loc}/projects    /{loc}/skills
```

Objets secondaires (Phase 9) : CV posé sur le bureau, terminal → GitHub, téléphone → LinkedIn,
cadre → À propos, bloc-notes → Contact.

---

## 2. Personas et parcours utilisateurs

### 2.1 Personas

| # | Persona | Contexte | Attente principale | Contrainte |
|---|---------|----------|--------------------|------------|
| A | **Recruteur / RH** | Desktop ou mobile, 60–120 s, souvent depuis LinkedIn | Comprendre le profil, récupérer le CV | Peu de patience, peu technique, ne « joue » pas avec la 3D |
| B | **CTO / Lead technique** | Desktop, 3–10 min | Évaluer la profondeur technique sur 1–2 projets | Va lire le détail, va ouvrir le GitHub |
| C | **Pair développeur / curieux** | Desktop puissant | L'expérience elle-même, le « comment c'est fait » | Tolérant au chargement, veut de la fluidité |
| D | **Crawler / bot** (Googlebot, aperçu LinkedIn, lecteur d'écran) | Sans interaction | Du HTML sémantique, des métadonnées | Peut ne pas exécuter JS, ne verra jamais le canvas |

Le persona **D** est traité comme un utilisateur de premier rang, pas comme un cas limite.

### 2.2 Parcours principaux

**PU-01 — Découverte immersive (persona C, B)**

```text
/fr  →  scène chargée, bureau visible
     →  clic écran central (Projets)
     →  caméra se rapproche + router.push("/fr/projects")
     →  liste des projets affichée
     →  clic « Augure » → /fr/projects/augure
     →  lecture du détail
     →  Retour navigateur → caméra revient à l'état « projects »
     →  clic écran droit → /fr/skills
```

**PU-02 — Lecture rapide (persona A)**

```text
/fr  →  scroll immédiat / clic « Accéder au contenu »
     →  vue documentaire (liste des sections, sans immersion)
     →  /fr/experiences → lecture
     →  clic « Recevoir mon CV » → saisie e-mail → confirmation
```

**PU-03 — Deep link / partage (tous personas)**

```text
Ouverture directe de /fr/projects/augure
     →  HTML serveur complet immédiatement lisible
     →  la scène 3D s'hydrate ensuite dans l'état « projects / détail »
     →  aucun flash, aucun saut de mise en page
```

**PU-04 — Bascule de langue**

```text
/fr/projects/augure  →  sélecteur de langue  →  /en/projects/augure
     →  même entité, contenu anglais, état de scène inchangé
     →  si la traduction n'existe pas : repli argumenté (voir §5, R-07)
```

**PU-05 — Demande de CV**

```text
Formulaire (e-mail) → validation client + serveur
     → rate limit → envoi via fournisseur abstrait → message de confirmation
     → cas d'erreur : message neutre, aucune fuite d'information
```

**PU-06 — Parcours dégradé (WebGL absent, JS partiel, reduced-motion)**

```text
/fr  →  détection d'échec / de préférence
     →  aucune tentative de montage du canvas
     →  expérience documentaire complète, aucune fonctionnalité perdue
     →  aucun message d'erreur anxiogène ; au plus une mention discrète
```

**PU-07 — Mobile (persona A majoritairement)**

```text
/fr sur smartphone
     →  expérience documentaire en premier plan
     →  scène 3D simplifiée (ou décorative, ou absente selon le palier device)
     →  navigation par onglets / liens standards, pas par clic sur un écran 3D minuscule
```

---

## 3. Contraintes fonctionnelles

| ID | Contrainte |
|----|------------|
| CF-01 | Trois sections principales : Expériences, Projets, Compétences, chacune mappée à un écran. |
| CF-02 | Chaque Experience et chaque Project important possède une page de détail à URL propre. |
| CF-03 | Français et anglais dès le départ ; ajout d'une 3e langue sans refonte. |
| CF-04 | Chaque état de navigation significatif = une URL réelle, partageable, rechargeable. |
| CF-05 | Le routeur Next.js est la source de vérité de l'état de navigation ; la scène s'y synchronise. |
| CF-06 | Toute action réalisable dans la scène possède un équivalent DOM focusable et activable au clavier. |
| CF-07 | Un visiteur peut demander l'envoi du CV à son adresse e-mail. |
| CF-08 | L'adresse e-mail n'est pas persistée en base. |
| CF-09 | Le contenu éditorial vit en Markdown/MDX ; aucune duplication dans du JSON de traduction. |
| CF-10 | Un frontmatter invalide fait échouer le build. |
| CF-11 | Liens sortants : GitHub, LinkedIn, e-mail de contact. |
| CF-12 | Le portfolio reste entièrement utilisable sans Three.js. |

---

## 4. Contraintes techniques

| ID | Contrainte | Nature |
|----|------------|--------|
| CT-01 | Next.js App Router, React, TypeScript en mode `strict` (+ `noUncheckedIndexedAccess`). | Imposée |
| CT-02 | React Three Fiber + Three.js + @react-three/drei pour la couche immersive. | Imposée |
| CT-03 | Contenu Markdown/MDX + frontmatter YAML validé par schéma typé (Zod). | Imposée |
| CT-04 | Vitest + React Testing Library + Playwright. ESLint + Prettier. | Imposée |
| CT-05 | Rendu serveur / statique partout où c'est pertinent (SSG par défaut). | Imposée |
| CT-06 | Pas de backend séparé : Server Action / Route Handler Next.js pour l'envoi du CV. | Imposée |
| CT-07 | Le fournisseur d'e-mail est masqué derrière une interface métier substituable. | Imposée |
| CT-08 | Aucune dépendance structurante sans justification écrite (problème / adéquation / alternatives / arbitrage). | Imposée |
| CT-09 | La couche Content ne dépend d'aucun module Three.js (vérifiable par lint de dépendances). | Dérivée |
| CT-10 | La logique de scène (mapping route ↔ écran ↔ caméra) est testable sans contexte WebGL. | Dérivée |
| CT-11 | **Le développement se fait dans un environnement Docker** : aucune installation de Node.js sur l'hôte n'est requise ni supposée. Toute commande du projet (`lint`, `test`, `build`, `e2e`) s'exécute dans un conteneur. Voir [ADR-0007](./adr/0007-dockerized-development-environment.md). | Imposée |
| CT-12 | La version de Node est **pinnée une seule fois** (image de base) et cohérente entre dev, CI et production. | Dérivée de CT-11 |
| CT-13 | Aucun binaire natif (`node_modules`, cache Next, navigateurs Playwright) ne fuit du conteneur vers l'hôte : volumes nommés dédiés. | Dérivée de CT-11 |

---

## 5. Exigences non fonctionnelles

### 5.1 Performance

Budgets chiffrés et méthode de mesure : voir [`performance-budget.md`](./performance-budget.md).
Résumé des seuils bloquants :

- Le contenu HTML n'attend jamais Three.js (chargement du bundle 3D strictement différé).
- LCP ≤ 2,0 s / CLS ≤ 0,05 / INP ≤ 200 ms sur profil mobile throttlé.
- ≥ 55 FPS desktop, ≥ 30 FPS mobile milieu de gamme.

### 5.2 Accessibilité

- Cible **WCAG 2.2 niveau AA**.
- Navigation complète au clavier, focus visible, ordre de tabulation cohérent.
- Le `<canvas>` est `aria-hidden` : il ne porte aucune information, seulement du rendu.
- `prefers-reduced-motion: reduce` → aucune animation de caméra, transitions instantanées.
- Score axe-core : **0 violation** de niveau `serious` ou `critical` sur toutes les pages testées.

### 5.3 SEO

- Chaque page de contenu est rendue côté serveur, complète, sans dépendance au canvas.
- `title`, `description`, `canonical`, `hreflang`, OpenGraph, `sitemap.xml`, `robots.txt`,
  JSON-LD (`Person`, `WebSite`, `CreativeWork`, `BreadcrumbList`).

### 5.4 Fiabilité et sécurité

- Aucune clé secrète exposée au client ; variables d'environnement validées au démarrage.
- L'endpoint CV ne peut pas être utilisé comme relais de spam (contenu fixe, rate limit,
  plafond global journalier).
- Messages d'erreur neutres : pas d'énumération d'adresses, pas de détail d'infrastructure.
- En-têtes HTTP de sécurité (CSP, `Referrer-Policy`, `X-Content-Type-Options`, HSTS).

### 5.5 Maintenabilité

- Couverture de tests : Statements ≥ 80 %, Branches ≥ 75 %, Functions ≥ 80 %, Lines ≥ 80 %.
- Modules critiques (content parser, routing, i18n, resume service, scene navigation state) :
  cible ≥ 95 % de branches.
- Ajouter un projet = créer **un fichier** par locale, rien d'autre.

### 5.6 Compatibilité

- Deux dernières versions majeures de Chrome, Firefox, Safari, Edge (desktop et mobile).
- Dégradation contrôlée en dessous, jamais d'écran blanc.

---

## 6. Risques

Échelle : Probabilité (P) et Impact (I) de 1 (faible) à 3 (fort). Priorité = P × I.

| ID | Risque | P | I | Prio | Mitigation | Phase |
|----|--------|---|---|------|------------|-------|
| R-01 | **Duplication du contenu** entre DOM serveur et surfaces 3D → incohérences, SEO dupliqué, double lecture par lecteur d'écran. | 3 | 3 | 9 | Instance unique de contenu déplacée par portail React (ADR-0004) ; test d'intégration comptant les occurrences dans le DOM. | 5–7 |
| R-02 | **Le bundle Three.js dégrade les Core Web Vitals** malgré le lazy loading (hydratation, main thread bloqué). | 3 | 3 | 9 | Import dynamique `ssr:false` + montage après `requestIdleCallback`/interaction ; budget CI sur la taille des chunks ; mesure à chaque phase 3D. | 5, 11 |
| R-03 | **Désynchronisation routeur ↔ scène** (back/forward, deep link, double source d'état). | 2 | 3 | 6 | Le routeur est l'unique source de vérité ; la scène est une fonction pure de l'URL (ADR-0002) ; tests unitaires du mapping + E2E back/forward. | 6 |
| R-04 | **Effort de modélisation 3D sous-estimé** (je ne suis pas modeleur 3D ; assets payants ou temps long). | 3 | 2 | 6 | Phase 5 avec primitives seulement ; direction artistique repoussée en Phase 8 ; assets externes sous licence claire ou low-poly assumé. | 5, 8 |
| R-05 | **Expérience mobile sacrifiée** au profit du concept desktop. | 2 | 3 | 6 | Paliers de device explicites (Phase 13) ; mobile = documentaire d'abord, décidé dès l'architecture, pas rétro-adapté. | 4, 13 |
| R-06 | **Endpoint CV utilisé comme relais de spam** ou pour harceler une adresse tierce. | 2 | 3 | 6 | Corps d'e-mail entièrement fixe, rate limit IP + adresse, plafond journalier global, honeypot + time-trap, journalisation d'abus. | 10, 14 |
| R-07 | **Contenu non traduit** dans une locale → page vide, 404 partielles, hreflang mensonger. | 3 | 2 | 6 | Règle de repli explicite : la version manquante n'est ni listée, ni référencée en hreflang, ni au sitemap. Test dédié. | 2, 3 |
| R-08 | **Incompatibilité de versions** React 19 / R3F / drei au moment de l'installation. | 2 | 2 | 4 | Vérification de la matrice de compatibilité en P5-01 avant toute écriture de scène ; versions figées (lockfile + `engines`). | 5 |
| R-09 | **Tests visuels 3D fragiles** (flaky) qui érodent la confiance dans la CI. | 2 | 2 | 4 | Logique testée en pur ; très peu de tests visuels, ciblés, avec tolérance ; jamais bloquants sur le rendu WebGL en CI par défaut. | 6, 12 |
| R-10 | **Fuite de mémoire GPU** lors des changements de route (géométries/textures non libérées). | 2 | 2 | 4 | Canvas persistant hors du remontage de route ; audit `renderer.info` en Phase 11 ; test E2E de navigation répétée. | 5, 11 |
| R-11 | **Rate limiting inopérant en serverless** (mémoire non partagée entre instances). | 2 | 2 | 4 | Interface `RateLimiter` abstraite ; implémentation mémoire en dev/test, store partagé en production (ADR-0006). | 10 |
| R-12 | **Sur-ingénierie de la Phase 0** : documentation qui diverge du code. | 2 | 2 | 4 | ADR courts, roadmap unique source de vérité des tâches, mise à jour obligatoire dans la Definition of Done. | toutes |
| R-13 | **Friction de l'environnement Docker** : hot reload lent ou muet sous WSL2, permissions de fichiers root, `node_modules` incompatible entre hôte et conteneur, E2E impossible à lancer. | 3 | 2 | 6 | Projet stocké dans le système de fichiers WSL2 natif (inotify fonctionnel) ; volumes nommés pour `node_modules` / `.next` ; conteneur exécuté avec l'UID/GID de l'hôte ; image Playwright officielle pour les E2E. Critère de sortie P1 : le hot reload et les E2E fonctionnent depuis le conteneur. | 1 |
| R-14 | **Divergence dev ↔ CI** si la CI n'utilise pas la même image que le développement. | 2 | 2 | 4 | Version de Node pinnée en un seul point ; job CI dédié qui construit et fait tourner l'image ; déclencheur documenté pour basculer toute la CI dans le conteneur (ADR-0007). | 1 |
| R-15 | **Charge d'exploitation du VPS** : TLS expiré, disque plein (logs, images Docker), noyau non patché, service à terre sans que je le sache. | 3 | 3 | 9 | TLS automatique (Caddy) ; `docker system prune` planifié ; mises à jour de sécurité automatiques ; healthcheck conteneur + supervision externe gratuite avec alerte ; procédure de restauration écrite et **testée** en Phase 15. | 15 |
| R-16 | **Origine mono-région** : TTFB et LCP dégradés pour les visiteurs éloignés du VPS, alors que le SEO et les Core Web Vitals sont des exigences. | 3 | 2 | 6 | CDN en frontal avec cache long sur les assets immuables (H-01b) ; pages statiques (SSG) donc cachables intégralement en périphérie ; mesure depuis plusieurs régions en Phase 11. | 11 |
| R-17 | **Surface d'exposition du VPS** (SSH ouvert, ports de service, secrets sur disque, conteneur en root). | 2 | 3 | 6 | Pare-feu par défaut fermé ; SSH par clé uniquement, sans mot de passe ni root ; conteneur non-root ; secrets en fichier `600` hors du dépôt ; en-têtes HTTP de sécurité ; audit en Phase 14. **Complété le 2026-08-12** : 80/443 n'acceptent plus que les plages Cloudflare, filtrées dans `DOCKER-USER` — `ufw` est inopérant sur les ports publiés par un conteneur, ce qui a été constaté et corrigé (`deploy/README.md` §6.3). | 14 |
| R-18 | **Déploiement sans filet** : pas de rollback, coupure pendant la mise à jour. | 2 | 2 | 4 | Images taguées par SHA de commit (rollback = redémarrer le tag précédent) ; healthcheck avant bascule ; procédure de rollback documentée et testée. | 15 |
| R-19 | **Délivrabilité du CV** : le CV arrive en indésirable, ou pas du tout. Le visiteur ne le reçoit pas et **je ne le sais pas** — échec silencieux de la seule fonction de conversion du site. | 1 | 3 | 3 | Fortement réduit par le choix d'un fournisseur géré : réputation d'IP, DKIM et gestion des rejets sont à sa charge. Reste à vérifier que le **domaine du portfolio** est bien authentifié (H-02a, P10-11) et à consulter le tableau de bord des rejets avant release (P15-09). Message de confirmation invitant à vérifier les indésirables. | 10, 15 |
| R-20 | **Quota Mailjet partagé avec Augure** : le formulaire envoie vers des adresses fournies par des inconnus. Un abus consommerait le quota d'un compte dont **un autre projet en production dépend** — Augure cesserait d'envoyer ses e-mails. | 1 | 3 | 3 | **Volet réputation : traité** par le domaine dédié authentifié (H-02a) — DKIM distinct de celui d'Augure. **Volet quota : traité par plafonnement** (H-02b) : 20 envois/jour au maximum, soit un ordre de grandeur sous le quota d'un plan d'entrée. Même saturé quotidiennement, le portfolio ne peut pas asphyxier Augure. Vérifié en P14-08. Résolution complète disponible (sous-compte) si le plan l'inclut. | 10, 14 |
| R-21 | **Adresse du visiteur transmise à un tiers** : contrairement à l'auto-hébergement, l'adresse saisie transite par Mailjet et y est journalisée. | 2 | 1 | 2 | Fournisseur européen, donnée minimale (adresse seule), aucune persistance de mon côté (CF-08), mention dans la page de contact. Aucun consentement requis puisque le traitement est nécessaire à l'exécution du service demandé par le visiteur lui-même. | 10 |
| R-22 | **Compromission du compte hébergeur** : tout le durcissement du serveur — SSH par clé, `ufw`, conteneur non-root — est contourné par la console Hetzner, qui permet de démarrer en système de secours, monter le disque et lire les secrets. Le mot de passe du compte est donc la véritable clé du serveur, et R-17 ne couvrait que la machine. | 1 | 3 | 3 | 2FA (TOTP) sur le compte, codes de récupération conservés hors du gestionnaire de mots de passe ; protections *delete* et *rebuild* sur le serveur **et sur l'IP primaire** ; aucun jeton d'API en lecture-écriture laissé dans le projet. Appliqué le 2026-08-12, à réauditer en Phase 14. | 14 |
| R-23 | **Indisponibilité de provisionnement chez l'hébergeur** : Hetzner restreint par intermittence la création **et le redimensionnement** d'instances, par manque de capacité et sur sélection aléatoire des clients (avertissement reçu le 2026-08-12). Toute procédure de reprise qui suppose « je recrée un serveur » peut échouer précisément le jour où on en a besoin. | 2 | 3 | 6 | Backups Hetzner activés : ils se restaurent **sur le serveur existant**, sans passer par une création — contrairement aux snapshots, dont la valeur de secours est entamée par cette restriction. Protections *delete*/*rebuild* contre l'erreur auto-infligée. Les restrictions étant par localisation, une reconstruction reste probable ailleurs (Falkenstein, Helsinki) au prix d'un changement d'IP. **La procédure de restauration de la Phase 15 ne doit pas supposer qu'un serveur neuf est disponible.** | 15 |

---

## 7. Hypothèses à valider (revue de Phase 0)

Ces points ne sont pas ambigus dans le code : ils sont **assumés explicitement** et attendent une
validation. Chacun peut être infirmé sans casser l'architecture, sauf mention contraire.

| ID | Hypothèse | Conséquence si infirmée |
|----|-----------|-------------------------|
| ~~H-01~~ | **Tranché (2026-08-11)** : auto-hébergement sur **VPS**, conteneur Docker `standalone` derrière un reverse proxy. Voir [ADR-0008](./adr/0008-self-hosted-vps-deployment.md). N'est plus une hypothèse. | — |
| ~~H-01a~~ | **Confirmée (2026-08-11)** : Hetzner CX23, **2 vCPU / 3,7 Gio** mesurés, Docker 29.7. Le conteneur consomme **38 Mo de RSS** en service, très en deçà du budget de 250 Mo. N'est plus une hypothèse. La surveillance de la RAM reste prévue en P11-08, mais sans caractère critique. | — |
| H-01b | Un **CDN/proxy en frontal** (Cloudflare, offre gratuite) est acceptable pour compenser l'origine mono-région. | Sans CDN, le TTFB hors zone géographique du VPS se dégrade → budget de performance à assouplir pour les visiteurs distants. |
| H-01c | Le déploiement est déclenché par la CI (push d'image + `docker compose pull/up` via SSH), pas manuellement. | Déploiement manuel = dérive et absence de traçabilité. Impact organisationnel. |
| ~~H-02~~ | **Tranché (2026-08-11, corrigé le même jour)** : envoi via **Mailjet**, le fournisseur déjà utilisé sur le projet Augure. Voir [ADR-0006](./adr/0006-resume-delivery.md). N'est plus une hypothèse. | — |
| ~~H-02a~~ | **Confirmé (2026-08-11)** : un nom de domaine dédié au portfolio sera acheté et **authentifié chez Mailjet** (SPF, DKIM, expéditeur validé). Devient une **action à réaliser**, pas une hypothèse — voir P1-17. | — |
| ~~H-02b~~ | **Tranché (2026-08-11)** : **compte Mailjet partagé** avec Augure, protection par plafond journalier bas (20/jour global, 5/24 h par IP, 2/24 h par adresse). Un sous-compte reste préférable **s'il est inclus dans le plan actuel** — gain gratuit — mais ne justifie pas de changer d'offre. Calibrage détaillé dans [ADR-0006](./adr/0006-resume-delivery.md). | — |
| H-02c | Le plan Mailjet en vigueur autorise le volume attendu (très faible : quelques envois par jour). | Détermine le calibrage du plafond journalier global, qui doit rester **sous** le quota du plan. |
| ~~H-03~~ | **Confirmée (2026-08-12)** : `public/resume/cv-fr.pdf` et `cv-en.pdf` sont dans le dépôt, en deux versions comme le prévoyait Q10. N'est plus une hypothèse. Les PDF portent `X-Robots-Tag: noindex` : accessibles par lien et par e-mail, jamais résultat de recherche autonome. | — |
| H-04 | **Français = locale par défaut**, `/` redirige vers `/fr` (ou négocie via `Accept-Language`). | Trivialement inversable en Phase 3. |
| H-05 | Volume de contenu v1 : ~4–8 expériences, ~6–12 projets, ~20–30 compétences. | Justifie un chargement de contenu sans base ni index externe. Au-delà de ~200 entrées, revoir ADR-0001. |
| H-06 | Pas de blog en v1 (architecture compatible avec un ajout ultérieur). | Ajout d'un 4e type de contenu, sans refonte. |
| ~~H-07~~ | **Confirmé (2026-08-11)** : un nom de domaine dédié sera acheté. Il sert simultanément au site (HTTPS, canonical, hreflang, OpenGraph) et à l'expédition du CV (SPF/DKIM). **À acheter tôt** : il conditionne P1-15 (déploiement HTTPS) autant que P10-11. Le choix est peu réversible — il est inscrit dans les URL canoniques, les `hreflang`, les métadonnées de partage et la signature DKIM ; en changer plus tard impose redirections et ré-authentification. | — |
| H-08 | Pas d'analytics tiers intrusif en v1 ; si besoin, solution sans cookie (donc **pas de bandeau de consentement**). | Un analytics à cookies impose une gestion du consentement → nouvelle phase. |
| H-09 | Modèles 3D : primitives puis assets low-poly (créés ou sous licence permissive), pas de photoscan. | Budget de performance et planning de Phase 8 à revoir. |
| H-10 | Un seul mainteneur (moi), pas de workflow multi-contributeurs. | Simplifie la CI et la revue. |

---

## 8. Définition du succès de la v1

- [ ] Un recruteur trouve, lit et partage n'importe quelle page sans jamais rencontrer le canvas.
- [ ] Lighthouse mobile : Performance ≥ 80, Accessibilité 100, SEO 100.
- [ ] Zéro violation axe `serious`/`critical`.
- [ ] Le portfolio fonctionne intégralement avec WebGL désactivé (prouvé par un projet Playwright dédié).
- [ ] La demande de CV aboutit, est limitée en fréquence, et ne stocke aucune adresse.
- [ ] Ajouter un projet ne demande qu'un fichier Markdown par locale.
- [ ] Toute la suite de tests et de gates passe en CI.

---

## Documents liés

- [`phase-0-questions.md`](./phase-0-questions.md) — **questionnaire de sortie de Phase 0** : les
  points restant à trancher, avec une recommandation par question
- [`architecture.md`](./architecture.md) — architecture candidate, couches, flux, arborescence
- [`testing-strategy.md`](./testing-strategy.md) — pyramide, outillage, conventions
- [`performance-budget.md`](./performance-budget.md) — budgets chiffrés et méthode de mesure
- [`roadmap.md`](./roadmap.md) — phases, tâches, statuts, critères d'acceptation
- [`adr/`](./adr/) — décisions d'architecture
</content>
