# Journal de la Phase 5 — Fondation Three.js

Ce que l'exécution a renversé, ce qui a été tranché, et ce que chaque tâche refuse d'affirmer.
Phases précédentes : [`phase-4-log.md`](./phase-4-log.md), [`phase-3-log.md`](./phase-3-log.md),
[`phase-2-log.md`](./phase-2-log.md), [`phase-1-log.md`](./phase-1-log.md).

**Critères de sortie de la phase** — chunk 3D ≤ 320 Ko et absent du chemin critique (prouvé) ; Core
Web Vitals de la Phase 4 non dégradés ; désactiver WebGL laisse le site intact ; budgets de la scène
primitive mesurés et consignés.

⛔ **Le contexte hérité, et il n'est pas neutre** : la Phase 4 a livré un portfolio **complet sans
Three.js**, et c'est un critère de sortie, pas une intention (ADR-0003). Tout ce que la Phase 5
ajoute est un enrichissement dont l'absence doit rester invisible.

---

## 1. P5-01 — la matrice de compatibilité, vérifiée par exécution

### 1.1 Ce que la tâche devait lever

R-08 : « incompatibilité de versions React 19 / R3F / drei **au moment de l'installation** », à lever
« avant toute écriture de scène ». La tentation est de lire les `peerDependencies` et de conclure.
Ce dépôt a déjà payé ce raccourci ailleurs — une affirmation que rien ne confronte au monde finit
fausse — donc la matrice a été **installée, typée et exécutée** dans un bac à sable isolé, sans
qu'une seule dépendance n'entre dans le dépôt. L'installation, elle, est P5-02.

| Paquet | Version publiée | Ce qu'il exige | Notre socle | Verdict |
|---|---|---|---|---|
| `three` | 0.185.1 | — | — | ✅ |
| `@react-three/fiber` | 9.7.0 | `react` **`>=19 <19.3`**, `three >=0.156` | react 19.2.8 | ✅ **sous un plafond étroit** |
| `@react-three/drei` | 10.7.8 | `react ^19`, `three >=0.159`, `@react-three/fiber ^9.0.0` | — | ✅ |
| `@types/three` | 0.185.4 | — | TypeScript 6.0.3 | ✅ |
| `@react-three/test-renderer` | 9.1.1 | `react ^19.0.0`, `@react-three/fiber >=9.0.0` | — | ✅ |

### 1.2 Les trois preuves, et ce que chacune ajoute

Un `peerDependencies` satisfait ne prouve qu'une chose : ce que le gestionnaire de paquets accepte
d'installer. Il ne dit rien des types, et rien de l'exécution.

1. **Installation** — `pnpm install` dans le bac à sable : 68 paquets, **zéro avertissement de
   pair**. C'est ce que R-08 nomme, et c'est le plus faible des trois.
2. **Types** — `tsc 6.0.3 --noEmit` sur une scène représentative (primitives R3F, `useRef<Mesh>`,
   `ThreeElements['group']`, un composant `drei`), avec **les options strictes du dépôt**
   (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`) :
   **zéro erreur**. TypeScript 6 est récent ; rien ne garantissait que les types de R3F v9 et de
   `@types/three` le suivent.
3. **Exécution** — la scène est réellement **montée par le réconciliateur de R3F**, en Node, sans
   WebGL, via `@react-three/test-renderer` : `react 19.2.8`, 1 mesh, 1 lumière, géométrie réelle
   `BoxGeometry`, et le `<Center>` de drei produit ses groupes. C'est la seule des trois qui prouve
   que React 19.2.8 et R3F 9.7.0 **s'accordent à l'exécution**.

⭐ **Les trois échecs rencontrés venaient de l'instrument, pas de la matrice** : une extension `.tsx`
qu'un `tsconfig` de bac à sable n'autorisait pas, un `process` sans `@types/node`, et Node incapable
de charger du JSX avec `--experimental-strip-types`. `scene.tsx`, lui, n'a produit **aucune** erreur
de type. Même leçon qu'en P4-16 : vérifier l'instrument avant de conclure quoi que ce soit.

### 1.3 ⛔⛔ Le poids, mesuré AVANT d'installer — et c'est lui qui décide

Le budget est en **transfert gzip** (`performance-budget.md` §4), et ces relevés y vivent au §4.3. Bundle ESM minifié par esbuild,
`react` et `react-dom` exclus puisqu'ils sont déjà dans le socle :

| Contenu du chunk | Minifié | **gzip** | Δ |
|---|---|---|---|
| `three` seul (`export *`) | 712,8 Ko | **184,2 Ko** | — |
| R3F + `three`, scène **sans** drei | 877,6 Ko | **237,5 Ko** | + 53,3 |
| + drei, **un** composant | 879,5 Ko | **238,4 Ko** | **+ 0,9** |
| + drei, **quatre** composants | 1 064,2 Ko | **303,7 Ko** | **+ 65,3** |
| + drei **entier** (`export *`) | 2 655,8 Ko | **802,8 Ko** | + 499,1 |

⛔⛔⛔ **La première version de ce tableau ne mesurait rien, et elle avait l'air d'une mesure.** Elle
opposait un `export *` de `three` + R3F à un import de cinq symboles nommés incluant drei — le
sur-ensemble y pesait **moins** que son sous-ensemble. C'est impossible, et c'était le signe que les
deux entrées ne différaient pas seulement par drei. ⭐⭐⭐ **Deux mesures ne se comparent que si leurs
entrées ne diffèrent QUE par ce qu'on veut mesurer.** Trouvée en revue, sur la seule lecture du
tableau ; j'en avais tiré « drei coûte moins que rien », qui était faux et rassurant.

⛔⛔ **Ce que les chiffres corrigés disent** : drei coûte **peu par composant, beaucoup par poignée**.
Un composant est gratuit ; **quatre composants courants** (`Center`, `Environment`, `OrbitControls`,
`Text`) coûtent **+65,3 Ko** et ne laissent que **16 Ko sous le seuil bloquant** ; l'importer en
entier coûte **2,5 fois** ce seuil. Le budget se joue sur la **forme et le nombre** des imports.

⛔⛔ **Le plancher est 237,5 Ko**, sans une ligne de drei — la cible de 220 Ko lui est **inférieure**,
donc inatteignable par construction. Le seuil bloquant de 320 tient, mais avec **5 % de marge** dès
quatre composants de drei. Voir l'arbitrage §1.6.

### 1.4 Le plafond de version, latent et non actif

R3F 9.7.0 exige `react >=19 <19.3`. Notre socle est en **19.2.8**, qui est aussi **la dernière
version publiée** : le plafond ne mord donc **pas aujourd'hui**, et il n'y a rien à arbitrer dans
l'immédiat. Mais dès l'installation, la politique de mise à jour du dépôt change de nature — **une
montée de React en 19.3 deviendra un choix contre R3F**, pas une montée de routine.

⭐ C'est exactement ce que R-08 demandait de figer : versions épinglées au `package.json` et au
lockfile. Le dépôt épingle déjà à la version exacte, sans accent circonflexe.

### 1.5 Deux bruits observés, ni bloquants ni à oublier

- `THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.` — émis **par R3F
  9.7.0**, qui emploie une API que `three` 0.185 déprécie. Aucune conséquence fonctionnelle
  aujourd'hui ; *déclencheur de réexamen* : le jour où `three` la **retire**, R3F devra avoir suivi.
- `The current testing environment is not configured to support act(...)` — attendu hors d'un
  environnement de test React. À traiter quand P5-05 écrira des tests de scène
  (`globalThis.IS_REACT_ACT_ENVIRONMENT`), pas avant.

### 1.6 Les arbitrages, posés au moment où ils naissent

| Sujet | Défaut recommandé | Condition de réouverture |
|---|---|---|
| **La cible de 220 Ko pour le chunk 3D** | ✅ **Tranché le 2026-08-20 (D9) : 260 Ko de cible, 320 de seuil bloquant**, et la Phase 8 monte à 300 / 350. La cible de 220 était **sous le plancher mesuré** de 237,5 Ko, donc intenable ; 260 laisse ~22 Ko, soit un à deux composants drei | Un `three` sur mesure, ou une version qui allège la distribution standard |
| **`drei` importé par composant nommé, jamais en entier** | **Contrainte dure**, pas une préférence : 238 Ko contre 803. Doit devenir un **garde** en P5-02 ou P5-09, pas une consigne de revue. ⚠️ Et le garde doit compter, pas seulement interdire `export *` : **quatre composants suffisent à consommer 80 % du seuil** | — |
| **Vérifier la matrice hors du dépôt** | Bac à sable jetable, aucune dépendance ajoutée : P5-01 devait pouvoir conclure **NO-GO** sans laisser de trace à défaire | — |

### 1.7 Verdict

**GO pour P5-02**, aux versions vérifiées ci-dessus, et sous les deux contraintes du §1.6 — dont la
seconde est désormais chiffrée : **cible 260 Ko, seuil bloquant 320** (D9, tranchée le 2026-08-20).
Le garde de budget de P5-02 s'appuie sur ces deux nombres, et sur eux seuls.

⚠️ Ce que P5-01 **ne** dit **pas** : rien sur le comportement dans **Next 16.3** — l'import dynamique
`ssr: false`, le découpage réel des chunks et l'absence du chemin critique sont P5-04 et P5-09. Le
bac à sable prouve la compatibilité des paquets entre eux, pas leur intégration au site.

⭐ **Rejouable, et le harnais est versionné** : `tools/compat-3d/` porte le manifeste, le
`tsconfig.json`, la scène et les deux scripts, avec la recette de rejeu. Il n'ajoute **aucune
dépendance** au dépôt — le manifeste s'y appelle `manifest.json` et se copie au moment de l'emploi.
⭐⭐ **Il est versionné à cause de l'erreur du §1.3** : un chiffre qui fixe le budget d'une phase doit
pouvoir être recontrôlé par quelqu'un d'autre, sinon la correction se refait de mémoire.

---

## 2. P5-02 — l'installation, et ce qu'elle ne coûte pas encore

### 2.1 Ce qui entre, et à quelles versions

`three@0.185.1`, `@react-three/fiber@9.7.0`, `@react-three/drei@10.7.8` en production,
`@types/three@0.185.4` en développement — **épinglés à la version exacte**, sans `^`, comme la
mitigation de R-08 l'exige. Justification complète : **ADR-0016**.

⭐ **L'ADR porte le numéro 0016 et non 0011** : les numéros 0011 à 0015 sont réservés à des décisions
déjà planifiées, et l'une d'elles — les assets 3D — est **nommée par la tâche P8-01** de la roadmap.
Prendre un numéro réservé aurait cassé une référence existante ; un numéro réservé ne se reprend pas.

### 2.2 ⭐⭐ Installer ne coûte rien, et c'est mesuré

| Relevé | Avant installation | Après |
|---|---|---|
| Socle partagé, 18 routes prérendues | 126,4 Ko | **126,4 Ko** |
| JS propre à chaque route | 8,2 Ko | **8,2 Ko** |
| Image de production | 273 Mo *(relevé de P4-12)* | **273 Mo** |

Pas un octet — ni dans ce qui est servi, ni dans l'image. C'est attendu — rien n'importe encore ces paquets, et Next ne met dans un chunk que ce
que le graphe atteint —, mais **attendu n'est pas vérifié** : c'est exactement la forme d'affirmation
que cette phase-ci a appris à ne pas croire sur parole. Le coût apparaîtra au montage du canvas
(P5-04), et c'est là qu'il sera pesé.

⭐ **L'image ne bouge pas non plus, et ce n'était pas acquis** : l'étage de construction installe
toutes les dépendances, développement compris. C'est la sortie `standalone` de Next — qui n'emporte
que ce que le traceur atteint — qui les laisse dehors. La même sortie avait d'ailleurs **démenti**
une prémisse de quatre phases en P4-13, en y incluant `content/` : elle n'emporte ni plus ni moins
que ce qui est atteint, et cela se mesure dans les deux sens.

### 2.3 Le garde, et ce qu'il ne garde pas

Une règle ESLint refuse l'import **global** de `drei` sur tout `src/**`, sous **quatre** formes :
`import * as` depuis la racine, `import * as` depuis un sous-chemin (`/native`), `export *`, et
**l'import dynamique du paquet entier**. Cette dernière n'était pas couverte par la première version
et c'est **celle que P5-04 va écrire** : le canvas se monte par import dynamique (ADR-0003), et un
`await import('@react-three/drei')` déplace le poids dans le chunk différé sans le réduire d'un
octet. Trouvée en revue, par exécution de la règle plutôt que par lecture.

⭐⭐ **Le garde est tenu par un banc, pas par un souvenir.** Il avait été « vu rouge » à l'écriture,
ce qui ne prouve rien pour demain : en configuration plate, un **second** bloc `no-restricted-syntax`
visant les mêmes fichiers **remplace** le tableau d'options entier — le garde cesse de rapporter,
`lint` reste vert, et rien ne le dit. Un garde désarmé se lit exactement comme un garde satisfait.
`drei-import-guard.test.ts` charge la configuration **réelle** du dépôt et éprouve les cinq formes,
dont celle qui doit rester verte.

⚠️ **Ce garde ne couvre que le cas catastrophique**, et il faut le dire ici plutôt que de laisser
croire au contraire : l'import global coûte 802,8 Ko gzip, mais **quatre composants nommés en
coûtent déjà 303,7**, soit 95 % de la cible et 80 % du seuil bloquant. Aucune règle de lint ne pèse
des octets. ⭐⭐ **Un garde syntaxique attrape une forme, pas une quantité** — la mesure du chunk réel
est **P5-04 / P5-09**, quand un chunk existera, et c'est écrit dans la règle elle-même.

### 2.4 Ce que P5-02 laisse ouvert

| Sujet | État |
|---|---|
| Le poids réel servi | **P5-04** : rien n'est importé, donc rien n'est mesurable au-delà de « inchangé » |
| Le compte des composants `drei` | **Non gardé.** Le seul garde possible aujourd'hui est syntaxique ; le budgétaire suppose un chunk |
| La **surface de dépendances** | **273 paquets** en production, dont **65 sous `drei`** — un quart, pour une bibliothèque de confort (`@mediapipe/tasks-vision`, `draco3d`, `hls.js`, un moteur physique). Nuls en poids servi, réels en audit et en mise à jour. Consigné dans ADR-0016 |
| `THREE.Clock` déprécié par `three` 0.185, employé par R3F 9.7.0 | Avertissement en console, sans conséquence. *Déclencheur* : le jour où `three` retire l'API |
| Montée de React au-delà de 19.2.x | **Devient un choix contre R3F** (`react >=19 <19.3`). À vérifier à chaque campagne de mise à jour |

---

## 3. D10 — la scène décrit le bureau réel, et un dossier existait déjà

### 3.1 Ce qui est arrivé, et d'où

Un **dossier de scène complet**, préparé le 2026-08-14 hors de ce dépôt et transmis le 2026-08-20 :
un plan coté de 45 Ko tiré de quatre photographies du poste réel, les données de scène en TypeScript
pur (`layout.ts`), le composant R3F (`Desk.tsx`), le montage du canvas (`Scene.tsx`), une preview
`three.js` autonome, une scène Blender de contrôle et les quatre cadrages rendus.

⭐⭐ **Il n'est pas une maquette : il est mesuré.** L'échelle vient d'un étalon — un clavier plein
format de 0,44 m, seul objet normalisé entièrement visible dans le plan du plateau — et la scène est
**déjà comptée** : **30 draw calls et 4 114 triangles** en desktop, 20 et 1 966 en mobile, soit 3 %
du budget triangles. Le dossier en tire la conclusion qui compte pour la suite : *la contrainte réelle
sera le coût des ombres, pas la géométrie.*

⭐ **Primitives uniquement, aucun modèle importé, aucune texture, aucun asset sous licence inconnue.**
Cela s'accorde exactement avec ADR-0003 et laisse intact l'ADR-0011 réservé aux assets de la Phase 8.

### 3.2 L'arbitrage que le dossier refusait de trancher seul

Il s'arrête sur une question et l'écrit comme telle : *« rien ne devrait être figé côté navigation
avant cet arbitrage »*. Le bureau réel porte **deux moniteurs et un portable**, pas trois écrans,
alors que la roadmap disait « bureau + trois écrans » et que la métaphore de navigation était
gauche / centre / droite.

✅ **Tranché le 2026-08-20 (D10) : le bureau réel est assumé.** L'affectation était déjà en place et
ne change pas — écran gauche portrait → *Expériences*, écran central paysage → *Projets*, dalle du
portable → *Compétences*, plus une vue d'ensemble pour `/`.

⚠️ **Ce que cela impose à la Phase 6** : les trois cibles n'ont ni la même taille apparente ni la
même hauteur, et le cadrage *Compétences* est le seul à **16°** de champ au lieu de 34–36° — parce
que le portable est le seul objet dont on cadre un écran monté sur un corps profond, et qu'à 34° sa
base se projetait 63 % plus large que son capot. Conséquence directe : **le `fov` doit être interpolé
avec la position**, sans quoi la transition vers *Compétences* produit un zoom sec.

### 3.3 Ce que le dossier apprend, et qu'on n'aurait pas trouvé seul

Sept pièges y sont consignés, chacun payé au moins une fois. Trois valent au-delà de cette scène :

- ⛔⛔ **L'ordre d'Euler `XYZ` de Blender compose Rz·Ry·Rx, celui de three.js Rx·Ry·Rz.** Le même
  triplet donne deux orientations différentes ; vérifié sur le capot du portable, où `(−15, −4, 0)`
  rend deux axes distincts. La scène Blender est donc en `rotation_mode = 'ZYX'`, ce qui rend les
  triplets recopiables sans conversion.
- ⛔⛔ **Une valeur physiquement juste peut être visuellement nulle.** Les premiers chanfreins,
  mesurés sur du vrai matériel à 1,5–3 mm, se projetaient sur 1,5 pixel à la distance de navigation
  — invisibles. Ils sont délibérément portés à 5–8 mm. Et la moitié du réglage n'était pas la taille
  mais la **rugosité** : à 0,70, la facette d'un chanfrein renvoie la même valeur que la face
  voisine, et l'agrandir n'y change rien.
- ⛔⛔ **Depuis three r155, l'intensité d'une ponctuelle change de LOI, pas d'échelle** : atténuation
  en 1/d^`decay`, `decay` à 2. Une conversion par 4π donnait une irradiance 45 fois trop forte, et la
  scène entière paraissait délavée — le premier réflexe, à tort, étant de chercher le défaut dans
  l'éclairage.

⭐⭐ Et une méthode, qui a trouvé quatre défauts qu'aucune relecture n'avait vus : vue orthographique
de dessus, gros plan d'arête **découpé dans le rendu livré à sa résolution réelle**, balayage de
rayons sur une silhouette composite, et `renderer.info` plutôt qu'un décompte à la main. *Un cadrage
qui ne sert pas la navigation peut rester le seul à dire la vérité.*

### 3.4 ⭐⭐ Ce qui entre dans le dépôt, et ce qui n'y entre pas

**Seul `layout.ts` entrera**, au moment de P5-05 : les cotes, les matériaux et les nœuds, c'est-à-dire
ce dont le code a besoin. Le dossier de référence, les photographies et la scène Blender **restent
hors du dépôt**, qui est public — un plan coté qui décrit un domicile n'a pas à être publié pour
qu'un portfolio affiche un bureau.

⚠️ **La contrepartie est réelle, et il faut l'écrire plutôt que la taire** : `layout.ts` arrivera
**sans son dossier**, donc sans le *pourquoi* de ses valeurs. Un chanfrein à 8 mm y paraîtra
arbitraire alors qu'il résulte d'une mesure au pixel ; un lacet à 0° sur le portable paraîtra un
oubli alors qu'il est une correction mesurée à 28 % d'écart. ⭐ Le remède n'est pas de tout recopier :
c'est que les valeurs **non déductibles** portent leur raison en commentaire, à l'endroit où elles
sont écrites — ce que `layout.ts` fait déjà pour la rugosité du plastique noir et pour la fusion des
champs de touches. Le reste renvoie au dossier, **nommé mais non versé**.

### 3.5 Ce que D10 laisse ouvert

| Sujet | État |
|---|---|
| Huit hypothèses de cotes | **Ouvertes**, listées au §9 du dossier. ⭐ Une seule est décisive : **la largeur du plateau au mètre ruban** — la mesure photo donne 1,37 m, la valeur retenue 1,40, et une seule lecture verrouille toute la scène |
| Quatre intensités d'éclairage | **Non réglées.** Ce sont les seules valeurs que ni le calcul ni Blender ne peuvent trancher : elles se règlent au curseur dans la preview, puis se recopient |
| Rig de caméra | **N'existe pas.** Le montage place la caméra sur l'état courant, sans animation — ce qui est aussi le comportement attendu en `prefers-reduced-motion` |
| `<ContactShadows>` et `RoomEnvironment` | **Débloqués** : le dossier les conditionnait à la confirmation de `drei`, acquise avec ADR-0016. Ce sont des imports nommés, donc compatibles avec le garde de P5-02 |
| Entrée du dossier dans le dépôt | ✅ **Tranché : le dossier RESTE sur Drive**, seul `layout.ts` entrera (§3.4) |

---

## 4. P5-03 — les quatre paliers, décidés sans rien lire

### 4.1 Ce que la séparation achète

ADR-0003 pose quatre paliers — `full`, `reduced`, `lite`, `none` — et les fait dépendre de six
mesures du navigateur. Écrire tout cela d'un bloc aurait rendu la décision **inéprouvable** : jsdom
n'implémente pas WebGL, et aucun banc ne produit sur commande un appareil à 2 Go de mémoire ou une
demande d'économie de données.

D'où deux modules et une frontière stricte :

- `resolve.ts` — **pure**, aucune lecture, aucune globale. Elle reçoit six valeurs et rend un palier.
- `adapter.ts` — la seule à lire le navigateur, et **elle le reçoit en argument**. Ce qui est lu se
  voit dans un type de sept lignes plutôt que de se perdre dans `window`.

Résultat : 30 cas, **100 % de couverture**, sur des environnements qui n'existent pas ici — Safari
sans `deviceMemory`, un mobile en économie de données, une machine dont WebGL est désactivé par
configuration.

### 4.2 ⛔ L'ordre de résolution est la décision, pas une commodité d'écriture

Les conditions d'ADR-0003 **se chevauchent** : un mobile qui demande `prefers-reduced-motion`
satisfait à la fois « lite » (mobile) et « reduced » (mouvement réduit). Le tableau ne dit pas
laquelle l'emporte.

**La fonction retient toujours le palier le plus bas**, et la raison est asymétrique : refuser du
mouvement à qui en demande moins est correct ; servir une scène animée à un appareil qui ne la tient
pas ne l'est pas. Deux cas du banc tiennent cette règle explicitement.

### 4.3 ⛔⛔ Une mesure ABSENTE n'est pas une mesure BASSE

`navigator.deviceMemory` n'existe **que sur Chromium**. Firefox et Safari ne l'implémentent pas.

Traiter cette absence comme « 0 Go » — ce que ferait n'importe quel `?? 0` — enverrait **tous** leurs
visiteurs en `lite`, sur un défaut d'instrument et non de machine. Le type porte donc `number | null`
et non `number`, `null` signifie *inconnu*, et un axe inconnu **ne dégrade rien à lui seul** : trois
tests le tiennent. ⭐⭐ C'est la même faute que celles que la Phase 4 a traquées toute sa durée —
*une absence et une valeur basse se lisent pareil si rien ne les distingue*.

### 4.3 bis ⛔⛔ La préférence de mouvement était avalée par le palier

Trouvé en revue, et c'est le défaut le plus grave de la tâche.

`pointer !== 'fine'` décide **avant** tout le reste : un mobile tombait en `lite`, et
`prefersReducedMotion` n'était **jamais évalué**. Or ADR-0003 ne garantit l'absence de mouvement
qu'au palier `reduced` — il définit `lite` comme « scène décorative non interactive, **ou** visuel
statique », ce qui autorise une décoration animée. Conséquence mesurable : **un iPhone avec
« Réduire les animations » recevait une scène animée**, pendant que la même préférence était honorée
sur un poste fixe. Et mon propre banc **épinglait** ce comportement, donc rien en aval ne l'aurait
rattrapé.

⭐⭐⭐ **Une préférence d'accessibilité et un coût matériel sont deux axes orthogonaux ; les projeter
sur un seul ordinal en perd un.** `resolveCapability` rend désormais `{ tier, motion }`, et `motion`
est lu **directement dans l'entrée** — aucune branche de capacité ne peut plus l'avaler.

⚠️ Le palier, lui, ne change pas : ADR-0003 fait de `reduced-motion` une condition de palier à part
entière, parce que la préférence coupe aussi l'ambiance et pas seulement les transitions. Un poste
capable qui la demande reste donc en `reduced`. Rien n'est amendé dans l'ADR : un axe est **ajouté**
à côté du sien, là où le sien ne pouvait pas porter l'information.

⭐ L'ordre d'arbitrage du projet — *accessibilité > indexabilité > performance > richesse de la
scène* — tranchait déjà la question ; encore fallait-il que le type puisse l'exprimer.

### 4.4 Les seuils, posés faute d'être écrits ailleurs

ADR-0003 dit « mémoire faible » et « appareil moyen » sans les chiffrer. Les valeurs retenues, à
l'endroit où elles s'appliquent : **≤ 2 Go** pour faible, **≤ 4 Go** ou **≤ 4 cœurs** pour moyen.

⚠️ Elles ne peuvent pas être plus fines : la spécification borne `deviceMemory` à [0,25 ; 8] et
l'**arrondit à une puissance de deux**, délibérément, pour ne pas offrir un signal d'empreinte. Un
seuil intermédiaire ne mesurerait rien de plus.

### 4.5 Un détail qui n'en est pas un

⛔ **Le contexte WebGL obtenu pour la détection est rendu aussitôt.** Un navigateur en tolère un
nombre limité — de l'ordre de 16 — et sur mobile, en réserver un pour savoir s'il en existe revient
à le retirer à la scène qu'on s'apprête à monter. Un test vérifie que `loseContext` est bien appelé.

### 4.6 Ce que P5-03 laisse ouvert

| Sujet | État |
|---|---|
| Le palier est calculé, **personne ne le consomme** | P5-04 : c'est le montage du canvas qui le lira |
| La lecture est un **instantané** | `matchMedia` est interrogé une fois, la `MediaQueryList` n'est pas conservée : une préférence basculée **en cours de session** n'est pas observée. Acceptable pour un montage qui a lieu une fois ; les requêtes sont **exportées** (`MEDIA_QUERIES`) pour que P5-04 puisse s'abonner à `change` sans recopier les chaînes — une chaîne recopiée continuerait d'écouter l'ancienne le jour où elle change, en silence |
| `none` par **échec de chargement** ou perte de contexte | **P5-07**, error boundary — la fonction ne peut pas voir un import qui échoue |
| `none` par **absence de JavaScript** | Hors de portée par construction : sans JS, rien de tout ceci ne s'exécute, et c'est exactement le comportement voulu |
| Le seuil « appareil moyen » | Posé ici, jamais mesuré sur un vrai parc. *Déclencheur de réexamen* : un relevé de performance réelle en Phase 11 |

---

## 5. P5-04 — le canvas monté, et le budget qui cesse d'être théorique

### 5.1 Ce que le montage garantit, et par quoi

Quatre propriétés d'ADR-0003, chacune tenue par quelque chose plutôt que par une intention :

| Propriété | Ce qui la tient |
|---|---|
| Import **dynamique**, `ssr: false` | Mesuré : les cinq chunks du socle ne portent **aucune** occurrence de `WebGLRenderer` |
| Monté **après `idle`** | `requestIdleCallback`, avec un repli `setTimeout` — Safari ne l'implémente qu'à partir de la 18.2, et sans repli la scène ne se monterait **jamais** sur ces navigateurs, sans que rien ne le dise. ⛔ Le repli attend **la même échéance de 2 s**, et non 200 ms comme d'abord écrit : un repli dix fois plus pressé que ce qu'il remplace, sur les appareils les plus lents, n'est pas un repli |
| La **lecture** attend aussi | ⛔⛔ Elle **crée un vrai contexte WebGL** : la faire pendant l'hydratation coûtait des dizaines de millisecondes d'initialisation pilote, y compris à qui a demandé `save-data` et ne verra jamais la scène. Les deux promesses de la tâche n'étaient donc vraies qu'à moitié |
| `aria-hidden`, rien de focusable, aucun texte | Trois assertions du banc E2E, sur la racine désignée par `data-scene-root` |
| Au palier `none`, **rien** n'est chargé | `profiles/no-webgl/scene-absente.spec.ts` : aucun canvas, et **aucun chunk servi ne contient `WebGLRenderer`** |

### 5.2 ⭐⭐ Le budget de D9, mesuré pour de vrai

D9 avait arrêté 260 Ko de cible et 320 de seuil bloquant sur une estimation de bac à sable. Le
premier chunk réel les confronte :

| | Estimation P5-01 | **Mesuré ici** |
|---|---|---|
| Chunk 3D différé, gzip | 237,5 Ko | **226 Ko** |
| Socle partagé | 126,4 Ko | **127,0 Ko** (+0,6) |
| JS par route | 8,2 Ko | 8,2 Ko |

⭐ **Le vrai bundler fait mieux que l'estimation** — 226 contre 237,5. Le bac à sable était donc une
**borne haute**, ce qui est la bonne direction pour un budget : il aurait été fâcheux qu'il flatte.
La cible de 260 laisse aujourd'hui **34 Ko** pour `drei` et la scène, soit largement de quoi loger la
poignée de composants qu'elle demandera.

### 5.3 Deux corrections de conception, payées au banc

⛔ **Le décor plein écran pourrait tout intercepter.** Une couche `position: fixed; inset: 0`
couvre la fenêtre : sans `pointer-events: none`, elle avalerait **chaque clic du site documentaire**.

⛔⛔ **Et le test qui prétendait le garder ne gardait rien** — relevé en revue. Il cliquait un lien
et vérifiait la navigation ; or `z-index: -1` place déjà le décor sous tout élément dans le flux,
donc le clic aboutissait **avec ou sans** la ligne de CSS. Retirer ce qu'il protégeait l'aurait
laissé vert. ⭐⭐⭐ **Un test qui passe pour deux raisons possibles n'en garde aucune** : il faut
affirmer la propriété, pas son symptôme. Les deux sont maintenant vérifiées séparément —
`pointer-events` et l'empilement —, parce qu'elles protègent contre deux choses différentes : un
futur contexte de superposition peut annuler la seconde, jamais la première. **Vu rouge par
mutation** avant d'être cru : la ligne retirée, le test échoue sur `Received: "auto"`.

⛔⛔ **Mon banc partagé s'exécutait sous `no-webgl`.** Écrit dans `shared/`, il affirmait « le canvas
est là » — et `shared/` est joué par les quatre profils, dont celui dont **tout l'objet est qu'il n'y
soit pas**. ⭐⭐ *Un banc qui affirme une présence ne peut pas être partagé avec le profil qui prouve
l'absence.* Déplacé en `profiles/desktop-chromium/`, l'absence restant vérifiée en face.

⭐ Et un sélecteur trop large : `[aria-hidden="true"]` attrape d'autres éléments de la page. Le
contrôle « la scène n'écrit aucun texte » regardait donc autre chose qu'elle — vert pour une raison
fausse. La racine porte désormais `data-scene-root`, et le banc ne désigne plus qu'elle.

### 5.4 ⚠️ Trois échecs du banc local qui ne viennent pas de cette tâche

`make e2e` rend trois rouges sur cette branche. **Les trois préexistent**, vérifié en remisant la
modification et en rejouant chacun : la 404 du **serveur de développement** sert **deux**
`meta[name="robots"]` (`noindex` et `noindex, follow`), et les deux parcours de cibles tactiles
échouent également sans une ligne de cette tâche.

⭐ La CI, elle, joue l'E2E contre **l'image de production**, où ces trois-là passent — c'est pourquoi
`main` est vert. La dette est donc réelle mais locale : **le banc de développement et le banc de
production ne disent pas la même chose**, et personne ne le savait avant d'y regarder. Consigné ici
plutôt que corrigé dans une tâche qui n'en a pas le périmètre.

### 5.4 bis ⛔⛔ Le gate de production a refusé ce que le banc local acceptait

La CI a fait échouer la tâche là où `make e2e` la déclarait bonne — **148 parcours passés, puis
`valid-source-maps` en échec** sur les quatre audits Lighthouse.

La cause est nette : l'audit signale tout **gros JavaScript de première partie** servi sans carte de
sources, et le chunk 3D de 864 Ko franchit ce seuil que l'applicatif seul n'atteignait pas. Le site
n'émettait aucune carte — ce qui était sans conséquence tant qu'aucun script n'était assez gros
pour être regardé.

⭐⭐⭐ **C'est le premier refus produit par une décision prise quatre tâches plus tôt.** P4-13 avait
choisi de juger « bonnes pratiques » sur ses **audits** plutôt que sur son score, précisément pour
qu'un constat réel ne puisse pas être noyé dans une moyenne. Le score, ici, valait **100** : jugée
sur lui, la régression serait passée sans un mot.

Correctif : `productionBrowserSourceMaps: true`. L'image passe de 274 à **281 Mo** (sous le seuil
bloquant de 400), et **les visiteurs ne paient rien** — une carte n'est téléchargée que par un
navigateur dont les outils de développement sont ouverts. Vérifié en rejouant l'audit contre l'image
de production : *« aucun autre audit en échec »*.

⭐ Et une leçon d'exploitation locale : ce contrôle **ne tourne pas** dans `make e2e`. Il fallait
lancer Lighthouse contre l'image de production, ce que le conflit de port documenté rend malaisé —
d'où une surcharge `ports: !override []` pour y parvenir. Un gate qu'on ne sait pas rejouer chez soi
se découvre en CI, c'est-à-dire tard.

### 5.5 Ce que P5-04 laisse ouvert

| Sujet | État |
|---|---|
| La scène est **vide** | P5-05 la remplira ; ce qui est livré ici est le montage |
| Aucun garde n'interdit `three` dans le socle | **P5-09** : la mesure existe (les cinq chunks sont propres), le **garde** reste à écrire |
| Le divorce banc dev / banc prod | **Ouvert**, §5.4 — trois tests rouges en dev, verts en production |
| `matchMedia` lu une seule fois | Toujours vrai : basculer « Réduire les animations » en cours de session ne se voit qu'au rechargement. Les requêtes sont exportées pour qu'un abonnement soit possible sans recopier les chaînes |

---

## 6. P5-05 — la scène primitive, et une contradiction entre deux documents

### 6.1 Ce qui entre, et comment on sait qu'il est arrivé intact

Seul `layout.ts` rejoint le dépôt (D10). Il a fallu le **transcrire** — aucun outil ne l'écrit sur
disque — et une transcription se vérifie.

⛔ **Pas par sa taille.** Les raccords de blocs déplacent des sauts de ligne : deux octets d'écart
subsistaient, et la mise en forme n'est pas la donnée. ⭐⭐ **Une transcription se vérifie par ce
qu'elle PRODUIT** : le banc recompte, depuis les données seules, les chiffres que le dossier annonce.

| Relevé | Dossier | Recompté ici |
|---|---|---|
| Draw calls desktop / mobile | 30 / 20 | **30 / 20** |
| Triangles desktop / mobile | 4 114 / 1 966 | **4 114 / 1 966** |
| Touches clavier / portable | 104 / 76 | **104 / 76** |

Une seule cote mal recopiée, une rangée omise, et l'un d'eux tombe.

### 6.2 ⛔⛔ Deux documents se contredisaient, et le raisonnement a tranché

`layout.ts` affirmait, à deux endroits, que les champs de touches sont rendus en **`InstancedMesh`**.
Le dossier de scène, lui, dit **« fusionné en une seule géométrie »** — et dit *pourquoi* :
l'instanciation partage une géométrie et ne fait varier qu'une matrice, or le **fruit** du capuchon
est une *longueur absolue*. Une barre d'espace de 6,25 u instanciée depuis un capuchon de 1 u en
hériterait un six fois trop large.

⭐⭐⭐ **Entre deux documents qui se contredisent, celui qui porte le raisonnement l'emporte — et ici
le raisonnement est vérifiable.** Le banc le mesure : la plus large et la plus étroite des touches
diffèrent d'un facteur 5, et leur retrait vaut **1,2 mm dans les deux cas**. Les commentaires de
`layout.ts` sont corrigés, avec la raison à côté.

⭐ La fusion ne coûte d'ailleurs rien de plus : **un draw call par champ**, comme l'instanciation. Sa
mémoire supplémentaire est payée une fois au montage.

### 6.3 Ce que les géométries maison prouvent en pur

`chamferBox` et `taperedCap` sont écrites **sans un import de `three`**, en positions et indices. Ce
n'est pas un raffinement : une face retournée, un solide percé, un triangle dégénéré ne produisent
**aucune erreur** et ne se voient qu'à l'œil, sur un rendu, une fois la scène montée et éclairée.

Le banc en fait des assertions, avec les chiffres du dossier :

- **44 triangles** — 6 faces réduites, 12 facettes d'arête, 8 facettes de coin ;
- **24 sommets** : trois par coin, un par face adjacente — un sommet unique les lisserait et
  effacerait le chanfrein qu'on cherche à créer ;
- ⛔ **132 arêtes dirigées, chacune parcourue une fois dans chaque sens** : le solide est étanche ;
- ⛔ **aucune face retournée** — le contrôle que, selon le dossier, **22 triangles sur 44** avaient
  échoué à la première écriture. L'orientation n'est pas écrite à la main : elle est **calculée**,
  les deux solides étant convexes et contenant leur centre ;
- **10 triangles par capuchon**, la face inférieure étant plaquée contre le corps du clavier et
  jamais visible — 360 triangles économisés sur 180 touches ;
- ⚠️ et le capuchon **n'est pas étanche**, ce qui est dit explicitement pour qu'un futur contrôle
  générique ne le prenne pas pour un défaut.

### 6.4 Deux décisions de rendu, prises pour une raison mesurable

⭐ **Géométrie non indexée, normales recalculées.** Des sommets partagés feraient moyenner les
normales entre une face et la facette de son chanfrein — exactement le lissage que le chanfrein
existe pour éviter. ⚠️ Ce n'est **pas** `flatShading` sur le matériau : celui-ci est mutualisé, et
facetterait aussi la souris et l'abat-jour, dont le galbe est tout ce qui les rend reconnaissables.

⛔ **Les ombres sont coupées au palier `lite`.** Le dossier le dit après mesure : 4 114 triangles,
c'est 3 % du budget, et *« la contrainte réelle sera le coût des ombres, pas la géométrie »*.

### 6.5 Ce que la scène coûte, mesuré

| Relevé | Canvas vide (P5-04) | **Avec la scène** |
|---|---|---|
| Chunk 3D différé, gzip | 226 Ko | **229 Ko** |
| Socle partagé | 127,0 Ko | **127,1 Ko** |
| JS par route | 8,2 Ko | 8,2 Ko |

⭐⭐ **Le bureau entier coûte 3 Ko** — trente meshes, deux claviers fusionnés, quatorze matériaux,
trois lumières et deux géométries construites au montage. C'est ce que vaut une scène **en
primitives, sans un seul asset** : il n'y a ni texture, ni modèle, ni fichier à télécharger. La cible
de 260 Ko garde 31 Ko de marge.

### 6.6 Ce que P5-05 laisse ouvert

| Sujet | État |
|---|---|
| Les quatre intensités d'éclairage | **Non réglées** : elles se règlent au curseur dans la preview du dossier, seul endroit où elles sont observables, puis se recopient. Les valeurs en place sont celles du dossier |
| Le rig de caméra | **N'existe pas** : la caméra est posée sur la vue d'ensemble, sans animation — c'est P6-04, et c'est déjà le comportement attendu en `prefers-reduced-motion` |
| `<ContactShadows>`, `RoomEnvironment` | Palier suivant possible, débloqué par ADR-0016. Non pris : chaque composant `drei` se paie, et rien ne le demande encore |
| Les huit hypothèses de cotes | **Ouvertes**, dont une seule est décisive : la largeur du plateau au mètre ruban |
| Le banc E2E local | Toujours **3 rouges préexistants** (§5.4), plus une instabilité du même genre sur les canoniques — verte en isolation, rouge sous charge |

### 6.6 bis ⛔⛔ Une défense inatteignable fait tomber une porte

La CI a refusé la première version : **couverture de branches à 55,88 %** sur `src/scene/state`, où
le seuil est de 95. Je n'avais lancé que `make test`, jamais `make coverage`.

La cause n'est pas un trou de test, c'est du code que rien ne peut atteindre. Sous
`noUncheckedIndexedAccess`, `positions[i]` vaut `number | undefined` : chaque lecture indexée
réclamait un `?? 0`, et ce repli est **inatteignable** — les indices sont fabriqués deux lignes plus
haut. ⭐⭐ **Une branche inatteignable n'est pas inoffensive : la porte la compte, et elle a raison de
la compter.**

Le correctif n'ajoute aucun test : il **supprime la défense**. Les positions se lisent par `slice`,
qui ne rend pas d'`undefined` ; et les index de sommets, au lieu d'être cherchés dans une table, se
**calculent** — chaque coin pousse trois sommets dans l'ordre des axes, donc celui du coin `c` sur
l'axe `a` est `c * 3 + a`. ⭐ Les quinze invariants de la boîte chanfreinée, étanchéité à 132 arêtes
comprise, passent à l'identique : la réécriture est équivalente, et c'est le banc qui le dit.

### 6.7 ⛔⛔ Le profil mobile laisse deux objets sans ce qui les porte

Trouvé en revue, **mesuré**, et **non corrigé** — pour une raison qui vaut d'être dite.

| Ce qui est écarté sur mobile | Ce qui reste | Effet |
|---|---|---|
| `brasGauche`, `brasCentre` | `matBras` | un mât nu, et **deux moniteurs qui ne tiennent à rien** |
| `lampeSocle`, qui occupe `y ∈ [0 ; 0,030]` | `lampeTige`, qui **commence à `y = 0,030`** | une lampe **flottant à 3 cm** du plateau |

Le second est arithmétique : la tige commence exactement là où finit le socle qu'on retire.

⭐⭐ **Ce n'est pas un défaut de rendu mais une décision de plan**, et elle appartient à l'auteur de
la scène : les huit objets `desktopOnly` sont exactement ceux que le dossier énumère. Les corriger
demanderait d'en marquer d'autres — et **déplacerait les chiffres que le banc certifie** (20 draw
calls, 1 966 triangles), c'est-à-dire la preuve même que la transcription est fidèle.

⭐ **Il n'a probablement jamais été regardé** : le dossier documente quatre cadrages de navigation et
deux cadrages de contrôle, tous en profil desktop. Un profil qu'on n'a pas rendu est un profil dont
on ne sait rien — c'est le motif que ce dépôt rencontre depuis la Phase 4, ici appliqué à une scène.

*Ce qui le tranchera* : rendre la scène en profil `lite` et regarder. À faire avant P5-10, qui règle
la boucle de rendu, et avant toute mesure de performance mobile.

---

## 7. P5-07 — la frontière d'erreur, et le défaut qu'elle a révélé en production

### 7.1 ⛔⛔⛔ Ce n'était pas une précaution : c'était un défaut livré

La tâche s'annonçait comme une ceinture de sécurité — ADR-0003 point 5, *« toute défaillance fait
basculer en `none` »*. La mutation qui devait la voir rouge a dit autre chose.

**Sans frontière de scène, un chunk 3D manquant fait afficher « Une erreur est survenue » sur tout
le site.** L'import dynamique jette au rendu ; à défaut d'une frontière de scène, l'erreur remonte à
`src/app/[locale]/error.tsx`, la frontière de **page**, qui remplace le contenu par un avis
d'erreur. Un enrichissement raté devenait donc une panne visible du portfolio documentaire —
exactement ce que l'ADR interdit, et le contraire de ce que la Phase 4 a construit.

⭐⭐⭐ **Le défaut existait depuis P5-04**, c'est-à-dire depuis que le canvas est importé
dynamiquement, et rien ne pouvait le signaler : il ne se produit que lorsqu'un chunk manque, ce qui
n'arrive jamais sur une machine de développement. Il aurait fallu un déploiement laissant un chunk
derrière lui, ou un réseau qui coupe au mauvais moment. La mutation l'a produit en trois secondes.

⭐⭐ **Une frontière d'erreur ne se juge pas sur ce qu'elle attrape, mais sur ce qui l'attraperait à
sa place.** C'est la question qui a transformé cette tâche : il y avait déjà une frontière au-dessus,
et elle faisait précisément ce qu'il ne fallait pas.

### 7.2 Trois défaillances, trois endroits — et l'une n'est pas là où on la cherche

| Défaillance | Où elle se voit | Éprouvée par |
|---|---|---|
| Le chunk du canvas ne se charge pas | Le composant paresseux **jette au rendu** → frontière d'erreur | E2E, chunk refusé par le réseau |
| La scène jette pendant son rendu | Même frontière, autre origine | Vitest, sur la frontière elle-même |
| Le contexte WebGL est perdu | ⛔⛔ **Un événement du DOM — aucune frontière ne le verra jamais** | E2E, `WEBGL_lose_context` sur le contexte réel |

⛔⛔ **La troisième est celle qui se serait oubliée.** Une error boundary attrape des exceptions de
rendu ; `webglcontextlost` n'en est pas une. Sans écoute explicite, la scène resterait montée sur un
canvas définitivement noir — un décor mort que rien ne signale, et un contexte WebGL retenu de plus
sur un appareil qui vient justement d'en manquer.

### 7.3 ⛔⛔ Une scène abandonnée ne remonte jamais, et c'est tout l'objet du module

`mount-state.ts` porte trois états et deux transitions. La seule règle qui compte est que
`abandoned` est **terminal** : `sceneReady` appliqué à un état abandonné rend cet état, inchangé.

Sans elle, l'appareil dont le contexte se perd en boucle — celui-là même qu'ADR-0003 protège —
reçoit un cycle montage / perte / montage sans fin, parce que la lecture de capacité est différée
par `requestIdleCallback` et que React rejoue l'effet à chaque remontage, StrictMode compris.

⭐ **La décision vit dans `capability/` et non dans le composant**, pour la raison déjà donnée en
P5-03 : `src/scene/components/**` est exclu de la mesure de couverture et n'est tenu que par le banc
E2E — or cette propriété-ci protège d'un cycle qu'aucun banc ne produit sur commande.

⭐ **La première cause est conservée, pas la dernière.** Une perte de contexte suit souvent l'erreur
qui l'a provoquée ; c'est la première qui explique quelque chose.

⚠️ Ce n'est pas une renonciation définitive : un rechargement repart d'un état neuf. Ce qui est
refusé, c'est de réessayer **tout seul**, sans que rien n'ait changé.

### 7.4 ⭐ `ChunkLoadError` est mesuré, et le reste a été coupé

La distinction entre « le chunk n'est pas arrivé » et « la scène a jeté » ne change rien pour le
visiteur — même bascule, même absence de message. Elle change ce qu'on pourra dire le jour où un
déploiement laisse un chunk derrière lui.

Le nom n'a pas été deviné : le banc qui refuse le chunk du moteur l'a fait écrire par Turbopack dans
la console du navigateur — *« ChunkLoadError: Failed to load chunk … It was handled by the
`<SceneBoundary>` error boundary »*. C'est aussi la preuve que la frontière attrape réellement.

⛔ **Une première écriture ajoutait trois motifs de message** glanés d'autres écosystèmes (webpack,
import natif, Safari). Aucun banc ne les atteint et aucune mesure ne les fonde : du code défensif qui
prétend un diagnostic qu'on ne saurait pas vérifier. Coupé. La limite est écrite à côté du critère :
un moteur qui nommerait l'erreur autrement verrait sa défaillance classée `render`.

### 7.5 ⛔⛔⛔ Le banc s'est trompé trois fois de repère, et chaque fois il accusait le code

C'est la partie la plus instructive de la tâche, et elle ne concerne pas le produit.

1. **Lire le corps de chaque chunk dans l'intercepteur** — `Response has been disposed` : la lecture
   d'une réponse court après la vie de la requête qui l'a produite. On repère d'abord, on refuse
   ensuite, en deux chargements.
2. **Attendre que le canvas soit ATTACHÉ** — R3F pose le `<canvas>` dans le DOM *avant* de créer son
   contexte. Un `getContext('webgl2')` lancé dans cette fenêtre **crée un contexte à lui** et le
   perd ; celui de la scène, créé juste après, n'a rien vu. Le décor restait, et le parcours accusait
   le code.
3. **Attendre que le canvas ait une taille non nulle** — ⛔⛔ **un `<canvas>` sans attribut mesure
   300 × 150 par spécification.** Le repère était donc vrai dès l'attachement : il n'attendait
   rigoureusement rien. Corrigé en le comparant à la largeur de la fenêtre, que le décor couvre
   entièrement — un chiffre que seule la mise à l'échelle du renderer peut produire.

⭐⭐⭐ **Ce qui a permis de ne pas conclure trop vite est la forme de l'échec : il se DÉPLAÇAIT.**
Vert en isolation, rouge en suite complète, puis rouge sur l'autre test au run suivant. Un défaut
déterministe ne se déplace pas ; une course, si. Sans cette lecture, la conclusion naturelle était
« la bascule ne marche pas » — et le correctif aurait porté sur du code sain.

⭐⭐ **Et une valeur par défaut peut rendre un repère vrai avant l'événement qu'il attend.** C'est la
même famille que le test de P5-04 qui passait pour deux raisons possibles : ici, il passait pour
zéro raison.

### 7.6 L'écoute a fini dans `onCreated`, et le test n'y est pour rien

Première écriture : un composant enfant du canvas, `useEffect` puis `useLayoutEffect`. Les deux
laissent une fenêtre — un enfant du canvas n'attache son écouteur qu'au **rendu de l'arbre R3F**,
c'est-à-dire après la création du contexte.

L'écoute est donc posée dans `onCreated`, qui s'exécute dans la même passe synchrone que la création
du renderer : aucun événement ne peut s'y glisser. ⭐ **La fenêtre a été fermée dans le code, pas
dans le banc** — la rendre patiente aurait laissé le trou pour un visiteur réel, et le banc n'aurait
plus rien gardé.

⭐ `once: true` remplace le nettoyage, et le remplace exactement : la bascule est terminale, donc une
seconde perte n'aurait rien à dire ; l'écouteur se retire de lui-même après la première, et si le
canvas meurt sans avoir rien perdu il meurt avec lui — R3F en construit un neuf à chaque montage.

⚠️ `three` installe son propre écouteur et y appelle `preventDefault()`, ce qui demande au navigateur
de préparer une restauration. Nous ne l'attendons pas : le parent démonte le canvas, ce qui libère le
renderer et rend la restauration sans objet.

### 7.7 Les arbitrages, posés pendant la tâche

| # | Sujet | Décision | Ce qui la rouvre |
|---|---|---|---|
| 1 | Que voit le visiteur quand la scène tombe ? | **Rien.** Pas de message, pas de cadre, pas de bouton : le décor disparaît, enveloppe comprise. ADR-0003 point 5 le dit, et le contraire ferait d'un enrichissement raté un incident visible | Rien d'envisagé : ce serait changer l'ADR |
| 2 | Réessayer après une perte de contexte ? | **Non**, dans la session. Un rechargement repart d'un état neuf ; réessayer tout seul sur un appareil qui vient de perdre son contexte est le cycle qu'ADR-0003 évite | Un signal fiable de restauration (`webglcontextrestored`) *et* un cas d'usage mesuré — un réveil de veille, par exemple |
| 3 | Distinguer les causes de défaillance ? | **Oui, mais seulement là où c'est mesuré** : `ChunkLoadError`. Le comportement, lui, est le même pour les trois | Un second nom d'erreur observé sur un moteur réel |

### 7.8 Relevés — et un chiffre périmé de plus

Mesures prises dans le même conteneur, par le même geste (`gzip -9`), sur `main` puis sur la branche :
deux mesures ne se comparent qu'à ce prix.

| Relevé | `main` | **Avec P5-07** | Seuil |
|---|---|---|---|
| Socle partagé | 127,1 Ko | **127,1 Ko** | cible 136 · bloquant 146 |
| JS propre à chaque route | 10,5 Ko | **10,8 Ko** | cible 25 · bloquant 40 |
| Chunk 3D différé | 229,9 Ko | **230,0 Ko** | cible 260 · bloquant 320 |
| Tests | 733 | **742** | — |
| Couverture | 100 % | **100 %** sur les quatre métriques | ≥ 80 % |
| E2E | 148 | **150** | — |

⛔⛔ **Le « 8,2 Ko par route » que portent tous les documents est périmé : la mesure d'aujourd'hui sur
`main`, sans une ligne de cette tâche, est 10,5 Ko.** C'est la deuxième fois que ce chiffre dérive —
P4-12 avait déjà relevé 7,3 → 8,2 — et pour la même raison : il est **recopié** de tâche en tâche
avec la mention « inchangé ». La frontière d'erreur, elle, coûte **+0,3 Ko**, ce qui est la seule
chose que cette tâche a le droit d'affirmer.

⚠️ Le banc E2E local rend toujours **3 rouges préexistants** (§5.4), vérifiés inchangés : la 404 du
serveur de développement et les deux parcours de cibles tactiles. La CI, qui joue contre l'image de
production, ne les voit pas.

### 7.9 Ce que P5-07 laisse ouvert

| Sujet | État |
|---|---|
| Le palier `none` par échec est-il observable ? | **Non**, et c'est voulu : rien ne distingue à l'écran une scène qui n'a jamais monté d'une scène tombée. P5-08, le panneau de diagnostic, sera le premier endroit où la cause pourra se lire |
| Un moteur qui nommerait autrement l'échec de chunk | Classé `render`. Sans conséquence pour le visiteur ; à corriger le jour où un second nom est **observé** |
| `webglcontextrestored` | Jamais écouté (arbitrage 2). Le jour où on le voudrait, c'est la terminalité de `mount-state` qu'il faudrait rouvrir, pas le composant |
| La frontière ne couvre pas le layout | Une erreur du layout racine reste l'affaire de `global-error.tsx` : la scène n'y change rien |

### 7.10 ⭐⭐ D11 rendu — et ce que le profil `lite` a montré en plus

Le profil `lite` a été **rendu pour la première fois** (sonde jetable, Playwright + SwiftShader,
trois captures : `full` en référence, `lite` au même cadrage, `lite` sur iPhone 14 en portrait).

Ce que §6.7 annonçait est exact, et visible sans effort : le mât nu portant deux moniteurs qui ne
tiennent à rien, la tige de lampe s'arrêtant franchement au-dessus du plateau.

⭐ **Un troisième effet, que le journal n'avait pas prévu** : les ombres étant coupées au palier
`lite`, plus rien n'ancre les objets au plateau — la lampe flottante n'est même pas trahie par son
ombre. Les deux défauts se renforcent au lieu de se compenser.

⛔⛔ **Et une découverte qui dépasse D11 : sur un téléphone en portrait, le cadrage d'accueil est
perdu.** Le `fov` est vertical et les cadrages sont calculés pour 16:9 ; à 9:19,5 le champ horizontal
se referme et il ne reste qu'un morceau d'écran central et le portable. Ni bureau, ni lampe, ni écran
gauche. Le dossier de scène §6 l'avait écrit — *« si le format descend sous 16:9, augmenter le `fov`
plutôt que reculer »* — et cela n'a jamais été implémenté. **C'est de la caméra, donc P5-06**, et
c'est consigné ici plutôt que corrigé au passage dans une tâche qui n'en a pas le périmètre.

⭐⭐ *Un profil qu'on n'a pas rendu est un profil dont on ne sait rien* — le motif de §6.7, confirmé
au-delà de ce qu'il annonçait : le regard a trouvé un défaut de plus que la lecture.

---

## 8. P5-09 — le garde d'isolation, et le témoin sans lequel il ne prouverait rien

### 8.1 Ce que P5-04 avait laissé, et ce qui manquait

P5-04 avait **mesuré** que les chunks du socle ne portaient aucune occurrence de `WebGLRenderer`, et
consigné en toutes lettres ce qui restait : *« la mesure existe, le garde reste à écrire »*.
`performance-budget.md` §4 le demandait depuis la Phase 0, et dans une forme précise — « dans le
**graphe de dépendances** des chunks initiaux, plus fiable qu'un simple contrôle de taille ».

Une mesure prise une fois est une photographie. Ce qu'ADR-0003 promet — *le chunk 3D n'entre jamais
dans le chemin critique* — est une propriété permanente, et un import statique de `three` dans
n'importe quel composant du socle suffit à la rompre sans qu'aucune porte existante ne bronche : le
budget ne verrait qu'un poids, et 875 Ko de moteur passent sous les seuils de route seulement parce
que rien ne les y met.

### 8.2 ⛔⛔ Trois repères, tous mesurés — et le plus évident est faux

Le garde lit le graphe dans les **source maps**. ⭐⭐ Elles n'existent que par un enchaînement
heureux : `productionBrowserSourceMaps` a été activé en **P5-04** pour satisfaire l'audit Lighthouse
`valid-source-maps`, que le chunk 3D venait de faire rougir. *Le correctif d'une tâche est devenu
l'instrument d'une autre.*

| Repère candidat | Sur le chunk 3D (875 Ko) | Sur les scripts de première visite | Verdict |
|---|---|---|---|
| `sources[]` de la source map | **4 modules `three` / `@react-three`** | 0 | ✅ retenu |
| chaîne `node_modules/three/` dans le js | **« non »** | non | ⛔ **faux négatif** |
| chaîne `WebGLRenderer` dans le js | OUI | non | repli seulement |

⛔⛔ **Le repère apparemment évident — chercher `node_modules/three/` dans le code — rend « aucun
three » sur le chunk qui EST fait de three.** Turbopack ne laisse pas les chemins de modules dans le
code minifié. Un garde bâti dessus aurait été vert pour toujours, y compris le jour où il aurait dû
crier, et rien ne l'aurait signalé.

⛔⛔ **Et le nom d'une map ne se déduit pas de celui de son `.js`.** Turbopack les nomme séparément :
`1x3c9u4au-lzc.js` pointe vers `01b4c-1byoj-u.js.map`. Chercher `<script>.map` à côté du script rend
« aucune map » sur un répertoire qui en contient quinze — c'est la première chose que j'ai écrite, et
elle m'a fait croire un instant que le site n'émettait plus de source maps du tout. Le lien se lit
**dans le fichier**, `sourceMappingURL`.

⚠️ **Tous les scripts n'ont pas de map** : le bundle de polyfills n'en a aucune. Exiger une map
partout aurait rendu le garde rouge en permanence ; les ignorer en silence l'aurait rendu aveugle sur
110 Ko. Ils sont donc jugés par le repli, **et le garde l'affiche** — une limite d'instrument qui
s'écrit n'est plus un angle mort.

### 8.3 ⭐⭐⭐ Le témoin, qui est le cœur du garde

« Zéro module `three` dans la première visite » ne veut **rien dire** tant qu'on n'a pas montré que
l'instrument sait en voir. C'est la leçon de P4-16, appliquée à un garde neuf : *une absence et un
instrument aveugle se lisent exactement pareil.*

Le même détecteur est donc passé sur **tous** les chunks produits, et il doit trouver la scène
quelque part. S'il ne la trouve nulle part, le garde échoue **en s'accusant lui-même** :

```text
✗ Témoin absent : aucun des 13 chunks produits ne porte de module 3D.
  Ce garde ne peut donc rien affirmer — il ne sait pas s'il regarde une scène
  absente ou s'il est devenu aveugle […]. Corriger le détecteur avant de conclure.
```

C'est la seule partie du garde qui protège contre son propre pourrissement : source maps
désactivées, paquet renommé, bundler changé.

### 8.4 Une seule énumération, deux gardes — et la preuve que la refonte est neutre

La liste des scripts de première visite existait déjà, dans `check-bundle-budget.mts`, avec deux
corrections chèrement payées : le parcours **récursif** (4 pages mesurées sur 20 en Phase 3) et le
**contrôle de complétude** contre le manifeste de prérendu. La recopier aurait produit deux dérivées
d'une même vérité — et quand elles divergent, le message accuse celle qui n'a pas tort
(`phase-4-log.md` §14.3).

Elle est donc **extraite** dans `first-visit-scripts.mts`, que les deux gardes importent. Le nouveau
garde hérite gratuitement des deux corrections ci-dessus.

⭐ **La refonte est prouvée neutre par identité de sortie** : `pnpm bundle` avant et après rend
exactement les mêmes lignes, `diff` vide. C'était le seul risque de la tâche — toucher à un gate
existant pour en écrire un autre.

### 8.5 Ce que le garde examine, et qui déborde le budget

Les scripts `nomodule` sont **inclus**, alors que le budget les laisse dehors (vision.md §5.6,
navigateurs hors périmètre). Un budget parle de poids ; ADR-0003 parle de ce qui est **chargé**, et
« chargé » ne dépend pas du navigateur qui charge. C'est accessoirement la seule population sans
source map, donc celle où le repli se voit.

### 8.6 Vu rouge deux fois, sur les deux propriétés

⭐ Un garde qui n'a jamais échoué n'est pas un garde. Les deux mutations portent sur les deux choses
distinctes qu'il prétend tenir :

| Mutation | Attendu | Obtenu |
|---|---|---|
| `import { Vector3 } from 'three'` dans `scene-mount.tsx`, **valeur réellement utilisée** | le garde nomme le script fautif et le module | ✗ `0ngdypn_hoq6x.js` → `…/three/build/three.core.js`, sortie 1 |
| Détecteur aveuglé (les deux motifs remplacés par un motif introuvable) | le **témoin** crie | ✗ « Témoin absent : aucun des 13 chunks… », sortie 1 |

⛔ **La valeur importée devait être employée pour de bon.** Un `import` inutilisé aurait été élagué
par Turbopack : la mutation n'aurait rien produit, et j'en aurais conclu que le garde ne voit pas —
un faux négatif qui se lit exactement comme un défaut du garde.

⚠️ **Ce garde n'a pas de test Vitest, et c'est délibéré** : il lit un artefact de `next build`, que
Vitest n'a pas sous la main. Ce qui l'éprouve est la mutation ci-dessus, rejouable en trois gestes —
c'est écrit dans le fichier.

### 8.7 Relevés

| Relevé | Valeur | Seuil |
|---|---|---|
| Scripts de première visite examinés | **11** distincts, sur 18 routes | — |
| dont jugés par repli, faute de map | **1** (les polyfills `nomodule`) | — |
| Modules 3D trouvés | **0** | 0 |
| Témoin — chunk différé porteur | **1**, `1x3c9u4au-lzc.js`, 4 modules | ≥ 1 |
| Socle partagé | 127,1 Ko | cible 136 · bloquant 146 |
| JS propre à chaque route | 10,8 Ko | cible 25 · bloquant 40 |
| Tests | 742, couverture **100 %** | ≥ 80 % |

⭐ **Aucun octet servi ne change** : le diff de cette tâche ne contient pas un fichier de `src/`.
C'est vérifiable d'un `git diff --stat src/`, et c'est plus solide que de comparer deux mesures.

⚠️ **Un écart de méthode à connaître avant de comparer** : le chunk 3D pèse **230,8 Ko** quand on
gzippe le seul chunk porteur, là où §7.8 annonce 230,0 pour le même code. Les deux sont justes ; ils
ne comptent pas la même chose. *Deux mesures ne se comparent que si leurs entrées ne diffèrent que
par ce qu'on mesure* — ici, elles diffèrent par autre chose.

### 8.8 Les arbitrages, posés pendant la tâche

| # | Sujet | Décision | Ce qui la rouvre |
|---|---|---|---|
| 1 | Où le garde tourne | **Dans `pnpm bundle`**, à la suite du budget. La CI l'exécute déjà (`pnpm build && pnpm bundle`) : aucune porte neuve à câbler, donc aucune porte neuve à oublier | Un besoin de le jouer sans construire — impossible aujourd'hui, il lit `.next` |
| 2 | Les scripts `nomodule` | **Examinés**, bien qu'ils soient hors budget (§8.5) | — |
| 3 | Les scripts sans source map | **Repli sur une chaîne, affiché**, plutôt qu'exiger une map partout | Le jour où Next émettrait une map pour les polyfills |
| 4 | Pas de test Vitest | **Assumé** (§8.6) : l'objet du garde est un artefact de build | — |

### 8.9 Ce que P5-09 laisse ouvert

| Sujet | État |
|---|---|
| Le garde ne compte pas les composants `drei` | **Toujours vrai.** P5-01 avait établi que quatre composants coûtent 65,3 Ko ; le garde d'ADR-0016 reste **syntaxique** et celui-ci ne juge que la présence, jamais la quantité. Un budget du chunk différé lui-même n'existe pas encore |
| Le chunk 3D n'a pas de seuil appliqué | Sa cible (260) et son seuil (320) sont écrits dans `performance-budget.md` et **mesurés à la main** à chaque tâche. Rien ne les applique |
| `next-env.d.ts` oscille selon la dernière commande | Il pointe `.next/dev/types` après un `make up`, `.next/types` après un build — **et il est versionné**. Non corrigé ici : ce n'est pas le périmètre, mais c'est une divergence qui salit l'arbre d'une tâche sur deux |
