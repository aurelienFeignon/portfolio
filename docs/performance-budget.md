# Budget de performance

> Statut : **Phase 0 — en revue**
> Dernière mise à jour : 2026-08-11
> Les valeurs ci-dessous sont des **budgets initiaux**, à confronter aux mesures réelles en
> Phase 11. Un budget que l'on ajuste après mesure est sain ; un budget que l'on ajuste pour ne
> pas avoir à corriger le code ne l'est pas — tout relèvement doit être justifié par écrit.

---

## 1. Principe

La performance est un **critère fonctionnel** : une expérience 3D lente est une expérience ratée,
et un LCP dégradé est une perte de visiteurs et de classement.

Deux règles structurantes :

1. **Le contenu n'attend jamais la 3D.** Le bundle Three.js est chargé après l'interactivité du
   contenu, jamais en concurrence avec le LCP.
2. **On mesure avant d'optimiser.** L'outillage de mesure est mis en place tôt (Phase 5) ;
   l'optimisation est concentrée en Phase 11, sauf franchissement de budget.

---

## 2. Core Web Vitals

Profil de référence : **mobile milieu de gamme, réseau 4G throttlé (Lighthouse mobile)**, sur la
page d'accueil et sur une page de détail de projet.

| Métrique | Cible | Seuil bloquant | Notes |
|---|---|---|---|
| LCP | ≤ 1,8 s | **2,5 s** | Élément LCP = titre ou visuel documentaire, jamais le canvas |
| CLS | ≤ 0,02 | **0,05** | Le montage du canvas ne doit provoquer aucun décalage |
| INP | ≤ 150 ms | **200 ms** | Y compris pendant le chargement de la scène |
| TTFB | ≤ 400 ms | **600 ms** | Pages SSG servies depuis le VPS ; hors zone géographique, dépend du CDN (R-16, H-01b) |
| FCP | ≤ 1,2 s | 1,8 s | |
| TBT (lab) | ≤ 200 ms | 300 ms | Métrique la plus sensible au bundle 3D |

Rappel lié à l'auto-hébergement : le TTFB est mesuré **depuis au moins deux régions** en Phase 11.
Une bonne mesure depuis la région du VPS ne prouve rien pour un recruteur situé ailleurs.

## 3. Scores Lighthouse

| Catégorie | Desktop | Mobile |
|---|---|---|
| Performance | ≥ 95 | ≥ 85 |
| Accessibilité | **100** | **100** |
| Bonnes pratiques | ≥ 95 | ≥ 95 |
| SEO | **100** | **100** |

Accessibilité et SEO sont à 100 sans négociation possible : ce sont des exigences produit (§5
Vision), et ce sont les deux domaines où la 3D fait peser un risque.

### 3.1 Qui applique ces scores — ajouté en P4-13

⛔⛔ **Ils n'étaient appliqués nulle part.** Écrits ici depuis la Phase 0, ils n'existaient que dans
quatre documents : aucun gate, aucun parcours, aucune étape de CI ne produisait un score. C'est le
défaut du seuil de 400 Mo, découvert par P4-05 **en s'y référant** — *un seuil que rien ne fait
respecter n'est pas un seuil*. Relevé pendant l'inventaire de P4-12.

`scripts/check-lighthouse.mts` les mesure contre l'**image de production**, sur l'accueil et une
fiche (§2), en profil mobile et desktop. Il est branché sur `make ci` et sur la CI. **Trois manières
de juger, parce que les catégories ne se mesurent pas de la même façon** :

| Catégorie | Décide | Pourquoi |
|---|---|---|
| accessibilité, SEO | le **score**, à 100 | contrôles structurels : l'attribut est là ou il n'y est pas. Bloquants |
| bonnes pratiques | *aucun audit en échec* hors `is-on-https` et `redirects-http` | ⭐⭐ ces deux-là dépendent de l'**adresse d'interrogation** : le score vaut **78 en local** (`http://web:3000`, réseau Docker) et **100 en CI** (`http://localhost:3000`, contexte sûr aux yeux de Chrome). Juger sur le score ferait donc dépendre le verdict de l'endroit où l'on mesure ; la production est en HTTPS avec HSTS et un 308 |
| performance | rien : la valeur est **relevée** | dépend de la charge de la machine — mesurée à 100 puis 99 sur la même page à deux tirs. Un seuil bloquant produirait une CI rouge sur du code conforme |

⚠️ **Ce que cet audit ne mesure pas** : le réseau, le CDN et le TTFB depuis une autre région. Il juge
l'**artefact**, pas le service.

✅ **Le relevé qui fait foi est pris — 2026-08-20 (P4-16), Access levé**, contre
`https://aurelienfeignon.com`, même script avec `PLAYWRIGHT_BASE_URL` :

| Catégorie | Site réel | Banc local |
|---|---|---|
| accessibilité | **100** | 100 |
| SEO | **100** | 100 |
| bonnes pratiques | **100** | 78 — `is-on-https` et `redirects-http` échouent sur du HTTP nu |
| performance | **98** mobile · **100** desktop | 99–100 |

⭐⭐ **Le 78 local n'était pas une dette, c'était l'adresse d'interrogation** — la même page vaut 100
dès qu'elle est servie en HTTPS. Un seuil posé sur ce score aurait rendu le verdict dépendant de
l'endroit où l'on mesure ; le juger sur ses **audits** l'a rendu portable, et le site réel le
confirme.

---

## 4. Budget JavaScript

Mesures en **transfert gzip/brotli**, telles que rapportées par l'analyse de bundle.

| Élément | Cible | Seuil bloquant | Quand |
|---|---|---|---|
| ~~First Load JS partagé (toutes routes)~~ | ~~≤ 95 Ko~~ | ~~120 Ko~~ | **révisé, voir §4.1** |
| First Load JS partagé (toutes routes) | ≤ 136 Ko | **146 Ko** | Phase 1 |
| JS d'une page de contenu (hors partagé) | ≤ 25 Ko | **40 Ko** | Phase 4 |
| **JS total avant interactivité du contenu** | ≤ 120 Ko | **160 Ko** | Phase 4 |
| ~~Chunk 3D (three + R3F + drei, différé)~~ | ~~≤ 220 Ko~~ | ~~320 Ko~~ | **révisé, voir §4.3** |
| Chunk 3D (three + R3F + drei, différé) | ≤ **260 Ko** | **320 Ko** | Phase 5 |
| ~~Chunk 3D après direction artistique~~ | ~~≤ 260 Ko~~ | ~~350 Ko~~ | **révisé, voir §4.3** |
| Chunk 3D après direction artistique | ≤ **300 Ko** | **350 Ko** | Phase 8 |

Le chunk 3D **n'entre pas** dans le budget « avant interactivité » : c'est précisément ce que
garantit l'ADR-0003. Un test de non-régression vérifie qu'aucun module `three` n'apparaît dans le
graphe de dépendances des chunks initiaux — c'est plus fiable qu'un simple contrôle de taille.

Leviers prévus : import dynamique `ssr:false`, montage après idle, imports nommés depuis `drei`
(jamais l'espace de noms entier), pas de `three/examples` non nécessaires.

### 4.1 Révision du budget « First Load JS partagé » — 2026-08-11 (P1-12)

> ⚠️ **Un budget relevé après mesure, pas pour éviter de corriger du code.** La distinction est
> celle posée en tête de ce document, et elle est vérifiable ici : à la mesure, l'application ne
> contenait **aucun composant client**. Il n'y avait pas de code à corriger.

**Mesure** — Sur une application vide de tout JavaScript client (Next 16.3.0, React 19.2.8), le
socle chargé par toutes les routes pèse **126,0 Ko en gzip** : React, le runtime client de l'App
Router et le chargeur Turbopack. Les polyfills (`noModule`, 38,6 Ko) sont exclus : ils ne sont
servis qu'aux navigateurs hors périmètre (§5.6 de `vision.md`).

**Constat** — Le budget initial (95 Ko cible, 120 Ko bloquant) était **inférieur au plancher du
framework**. Il ne pouvait être tenu par aucune version du code, et une CI qui l'applique est rouge
le jour de sa création. Un tel seuil ne mesure rien : il se contourne ou se supprime.

**Décision** — Rebaser le budget sur ce qui est réellement sous le contrôle du projet : la **part
applicative ajoutée au-dessus du socle**.

| | Valeur | Signification |
|---|---|---|
| Socle mesuré | 126,0 Ko | Plancher du framework, remesuré à chaque montée de version |
| Marge applicative — cible | +10 Ko | soit **136 Ko** au total |
| Marge applicative — bloquante | +20 Ko | soit **146 Ko** au total |

La marge retenue est **plus stricte que l'intention initiale** (qui laissait implicitement 25 à
45 Ko d'application au-dessus d'un socle supposé plus léger). Justification : le portfolio est rendu
côté serveur, et sa richesse client vit dans la couche 3D, qui a son propre budget différé (320 Ko,
hors chemin critique). Le socle partagé n'a donc presque rien à porter.

Relevé au 2026-08-11 : **129,5 Ko**, soit **+3,5 Ko** applicatifs — le bootstrap du layout, sans
aucun composant client.

**À revoir en Phase 11** : le socle lui-même n'a pas été attaqué (il ne l'a pas été faute de temps
et faute d'enjeu à ce stade, l'application ne dépendant d'aucun JavaScript client). Si les Core Web
Vitals l'exigent, les pistes sont le fractionnement par route et la vérification de ce que Next 16
permet de retirer du runtime client.

**Vérification du gate** — Un composant client de 134 Ko de source ajouté au layout racine fait
échouer la mesure (82 Ko de JS de route contre 40 Ko bloquants, code de sortie 1). Le mécanisme a
été vu échouer avant d'être déclaré actif.

### 4.2 Le gate mesurait 4 pages sur 20 — corrigé le 2026-08-14 (Phase 3)

> ⚠️ **Un gate qui passait au vert en mesurant moins que ce qui existe.** La classe de défaut que ce
> dépôt traque, trouvée dans son propre outillage.

`scripts/check-bundle-budget.mts` énumérait les pages prérendues avec un `readdirSync` **non
récursif**. Jusqu'en Phase 3, le site n'avait qu'une route à la racine de `.next/server/app` : la
mesure était exacte, et rien ne signalait qu'elle ne descendait pas.

À l'arrivée du segment `[locale]`, il mesurait `/fr` et `/en` — jamais `/fr/projects`, jamais
`/fr/projects/augure`. Une page de détail qui aurait embarqué du JavaScript client serait passée
sous le budget **sans être vue**.

Constaté en lisant la sortie du gate (« Socle partagé par les **4** routes prérendues ») alors que le
build en annonçait 20. Corrigé par un parcours récursif.

**Relevé après correction (2026-08-14)** : **18 routes HTML** mesurées, socle partagé **129,5 Ko**
(inchangé depuis la Phase 1, dont +3,5 Ko applicatifs), et **0,0 Ko de JS propre sur les 18**. Le
site n'a toujours aucun composant client : la navigation et le sélecteur de langue sont des balises
`<a>`, ce qui rend le profil `no-js` vrai par construction.

---

### 4.3 Le chunk 3D, mesuré AVANT installation — 2026-08-20 (P5-01)

R-08 demandait de vérifier la compatibilité des paquets. La mesure du **poids** ne lui était pas
demandée : elle a été faite parce qu'un budget qu'on découvre après l'installation n'est plus un
budget, c'est un constat. Bundle ESM minifié par esbuild dans un bac à sable jetable, `react` et
`react-dom` exclus (déjà dans le socle), gzip :

| Contenu du chunk | Minifié | **gzip** | Δ vs la ligne au-dessus |
|---|---|---|---|
| `three` seul (`export *`) | 712,8 Ko | **184,2 Ko** | — |
| R3F + `three`, scène **sans** `drei` | 877,6 Ko | **237,5 Ko** | + 53,3 Ko |
| + `drei`, **un** composant (`<Center>`) | 879,5 Ko | **238,4 Ko** | **+ 0,9 Ko** |
| + `drei`, **quatre** composants | 1 064,2 Ko | **303,7 Ko** | **+ 65,3 Ko** |
| + `drei` **entier** (`export *`) | 2 655,8 Ko | **802,8 Ko** | + 499,1 Ko |

⛔⛔ **Une première version de ce tableau ne mesurait rien, et elle avait l'air d'une mesure.** Elle
comparait un `export *` de `three` + R3F à un import de cinq symboles nommés incluant `drei` : le
sur-ensemble y pesait **moins** que son sous-ensemble, ce qui est impossible et signait des entrées
non comparables. ⭐⭐⭐ **Deux mesures ne se comparent que si leurs entrées ne diffèrent que par ce
qu'on veut mesurer** — trouvé en revue, sur la seule lecture du tableau, avant qu'un budget de phase
ne s'appuie dessus. Le harnais est versionné (`tools/compat-3d/`) précisément pour que ce genre de
correction n'ait pas à se refaire de mémoire.

⛔⛔ **Ce que les vrais chiffres disent** : `drei` coûte **peu par composant et beaucoup par
poignée**. Un composant est gratuit (+0,9 Ko) ; **quatre composants courants** — `Center`,
`Environment`, `OrbitControls`, `Text` — coûtent **+65,3 Ko** et laissent **16 Ko sous le seuil
bloquant** ; l'importer en entier coûte **2,5 fois ce seuil**. Le budget se joue donc sur la **forme
et le nombre** des imports, ce qu'aucun seuil ne dit et qu'un garde doit tenir (P5-02 ou P5-09).

**Constat sur la cible** — le **plancher mesuré est 237,5 Ko**, sans une ligne de `drei`. La cible de
220 Ko lui est **inférieure** : comme le budget « First Load JS » de la §4.1 avant sa révision,
aucune version du code ne peut la tenir, et un objectif que rien ne peut atteindre s'apprend à
s'ignorer. Le **seuil bloquant de 320 Ko** tient, mais avec **5 % de marge seulement** dès qu'on
emploie quatre composants de `drei`.

✅ **Décision D9, tranchée par l'exploitant le 2026-08-20 : cible à 260 Ko, seuil bloquant inchangé
à 320.** La cible est le plancher mesuré (237,5) plus une réserve d'environ **22 Ko**, soit un à deux
composants `drei`. La ligne de la **Phase 8 monte avec elle**, à **300 / 350** : son 260 / 350 avait
été dimensionné comme « la cible de la Phase 5 plus 40 », et la laisser en place aurait privé la
direction artistique de toute marge.

⭐ **Contrairement à la §4.1, aucune révision n'excuse ici du code existant** : la mesure précède
toute écriture de scène — il n'y a pas encore une ligne à corriger, et le chiffre retenu est celui
qu'on ne peut pas descendre, pas celui qu'on n'a pas su tenir.

*Ce qui rouvrirait la question* : une distribution de `three` sur mesure, ou une version amont qui
allège la distribution standard.

---

## 5. Budget des assets 3D

| Élément | Cible | Seuil bloquant |
|---|---|---|
| Total GLB (compressé Draco ou Meshopt) | ≤ 1,5 Mo | **3 Mo** |
| Plus gros GLB isolé | ≤ 600 Ko | 1 Mo |
| Total textures (KTX2/Basis, ou WebP) | ≤ 1,5 Mo | **2,5 Mo** |
| Plus grande texture | 1024² | 2048² |
| Triangles affichés — desktop | ≤ 150 k | **250 k** |
| Triangles affichés — mobile (`lite`) | ≤ 50 k | **80 k** |
| Draw calls — desktop | ≤ 60 | **90** |
| Draw calls — mobile | ≤ 30 | **45** |
| Mémoire GPU (textures + géométries) | ≤ 120 Mo | **200 Mo** |
| Temps jusqu'à première image de la scène (desktop, cache froid) | ≤ 2,0 s | 3,0 s |

Ces budgets ne sont pas décoratifs : la Phase 8 impose une mesure **après chaque ajout d'objet**,
avec consignation `Avant / Après / Gain` dans le journal de phase.

---

## 6. Budget d'exécution (runtime)

| Métrique | Desktop (`full`) | Mobile (`lite`) |
|---|---|---|
| FPS en régime stable | ≥ 58 | ≥ 30 |
| FPS pendant une transition de caméra | ≥ 50 | ≥ 28 |
| Durée d'une image sur le thread principal | ≤ 8 ms | ≤ 16 ms |
| Allocations par image | ~0 (pas de création d'objet dans la boucle) | idem |

Règles d'implémentation associées : réutilisation des `Vector3`/`Quaternion` dans les boucles,
`frameloop="demand"` quand la scène est immobile, mise en pause du rendu quand l'onglet est masqué
ou le canvas hors écran.

---

## 7. Budget serveur (VPS)

Conséquence directe de l'auto-hébergement : les ressources sont finies et à ma charge.

| Métrique | Cible | Seuil d'alerte |
|---|---|---|
| RSS du conteneur en régime stable | ≤ 250 Mo | 400 Mo |
| *(relevé 2026-08-11 : **51 Mo** au repos, image de production)* | | |
| CPU en régime stable | ≤ 5 % | 25 % |
| Temps de réponse d'une page SSG (origine) | ≤ 50 ms | 150 ms |
| Taille de l'image Docker de production | ≤ 250 Mo | 400 Mo — **bloquant en CI depuis P4-05** |
| *(relevé 2026-08-11 : **381 Mo**, dont 340 Mo d'image de base — voir §7.1)* | | |
| *(relevé 2026-08-14, fin de Phase 3 : **385 Mo** — +4 Mo, le runtime du proxy)* | | |
| *(⚠️ **relevé 2026-08-16, P4-05 : 268,6 Mo** — dont 229,1 Mo d'image de base et 38,7 Mo d'application. Les deux relevés ci-dessus sont **périmés de ~117 Mo**, voir §7.2)* | | |
| Durée de démarrage à froid du conteneur | ≤ 5 s | 15 s |
| Taux de succès du cache CDN sur `/_next/static` | ≥ 95 % | — |

### 7.2 Ce que la mesure de P4-05 a corrigé — et ce qu'elle a révélé

⛔⛔ **Le chiffre de 385 Mo était faux de ~117 Mo, et il gouvernait une décision de
planification.** P4-05 était isolée et repoussée après P4-06 « parce qu'elle fait entrer ~7 Mo de
runtime MDX dans une image qui n'a que 15 Mo de marge ». Mesure du 2026-08-16, même cible
(`runner`), même digest de base, même architecture que la CI :

| Relevé | Documenté | Mesuré |
|---|---|---|
| Image de production | 385 Mo | **268,6 Mo** |
| dont image de base (digest épinglé, amd64) | 340 Mo | **229,1 Mo** |
| dont couche applicative | 41 Mo | **38,7 Mo** |
| Marge sous le seuil bloquant | 15 Mo | **131 Mo** |

Et le coût réel du runtime MDX, mesuré avant/après sur la même machine : **+0,5 Mo** (38,2 → 38,7 Mo
de couche applicative), non ~7.

⛔⛔⛔ **Le seuil de 400 Mo n'était appliqué nulle part.** L'étape « Mesurer la taille de l'image »
écrivait la valeur dans le résumé de la CI et n'en faisait rien. Un seuil que rien ne fait respecter
n'est pas un seuil — et c'est la tâche censée le consommer qui l'a découvert, en s'y référant.
Il est **bloquant depuis P4-05**, par comparaison en octets (`image inspect`, et non `image ls` qui
rend une chaîne déjà arrondie).

⭐⭐ La leçon dépasse le chiffre : **un nombre recopié dans quatre documents et jamais remesuré finit
par décider seul.** Celui-ci a réordonné une phase.

### 7.1 Taille de l'image de production — dépassement de la cible constaté (P1-13)

**Mesure (2026-08-11)** : 381 Mo au total, dont **41 Mo d'application** (`standalone` 40,1 Mo +
statiques 0,6 Mo) et **340 Mo d'image de base** `node:24-bookworm-slim`.

La cible de 250 Mo n'est atteignable par **aucune** image Node officielle : `node:24-alpine` pèse
234 Mo à elle seule, `node:24-trixie-slim` 335 Mo. Le dépassement ne vient donc d'aucun choix du
projet.

**Décision : ne rien changer, et ne pas relever le seuil non plus.** L'image reste sous le seuil
bloquant (400 Mo), et passer à Alpine — seule piste qui gagnerait ~100 Mo — coûterait la parité
glibc entre l'étage de build et l'étage d'exécution, avec un risque direct sur `sharp` en Phase 4.
Ce n'est pas un arbitrage à rendre sous pression d'un chiffre, et il modifierait l'ADR-0007.

**Ce qui compte réellement pour l'exploitation** : à chaque déploiement, seule la couche applicative
est transférée, soit **41 Mo**, l'image de base étant déjà présente sur le VPS. Le rollback consiste
à redémarrer une image déjà locale. La cible de 250 Mo mesurait la mauvaise grandeur.

**À trancher en Phase 11** (avec la mesure de consommation réelle du VPS) : remplacer cette ligne de
budget par « couche applicative par déploiement ≤ 60 Mo », qui est la quantité pilotable.

Ces chiffres sont dimensionnants pour H-01a (2 vCPU / 2 Go). L'optimisation d'images `next/image`
consomme le CPU du VPS : les visuels sont donc pré-dimensionnés au build et le cache d'images est
placé sur un volume persistant, pour ne pas recalculer après chaque déploiement.

---

## 8. Méthode de mesure

| Quand | Quoi | Comment |
|---|---|---|
| À chaque PR | Taille des bundles | Analyse de bundle + assertion sur les seuils, en gate CI (à partir de P1-10) |
| À chaque PR | Absence de `three` dans les chunks initiaux | Test de graphe de dépendances (à partir de P5) |
| Phase 5, 8, 11, 13 | Triangles, draw calls, mémoire GPU | `renderer.info` relevé dans un panneau de diagnostic activable |
| Phase 5, 8, 11, 13 | FPS | Relevé sur matériel réel, pas en émulation |
| Phase 11, 15 | Core Web Vitals lab | Lighthouse, profils desktop et mobile |
| Phase 11, 15 | TTFB multi-région | Mesure depuis au moins deux localisations |
| Continu (post-release) | Vitals terrain | Mesure côté client sans cookie, agrégée — si et seulement si H-08 tient |

Le panneau de diagnostic est développé dès la Phase 5 : mesurer tôt coûte peu, découvrir tard coûte
une refonte.

---

## 9. Procédure en cas de dépassement

1. **Mesurer** et consigner `Avant`.
2. **Identifier** la cause précise (bundle, asset, boucle de rendu, requête).
3. **Corriger**, puis re-mesurer et consigner `Après / Gain`.
4. Si le budget reste dépassé : **arbitrage explicite** — réduire l'ambition de la scène (palier
   `lite` élargi, objet retiré) plutôt que relever le seuil.
5. Un seuil n'est relevé qu'avec une justification écrite dans la roadmap et, s'il est structurant,
   un ADR mis à jour.

> Ordre de priorité en cas de conflit :
> **accessibilité > indexabilité > performance du contenu > richesse de la scène 3D.**
> Cet ordre est la règle d'arbitrage du projet ; il est rappelé ici parce que c'est en Phase 8
> qu'il sera tentant de l'oublier.
</content>
