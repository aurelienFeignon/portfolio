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
| Monté **après `idle`** | `requestIdleCallback`, avec un repli `setTimeout` — Safari ne l'implémente qu'à partir de la 18.2, et sans repli la scène ne se monterait **jamais** sur ces navigateurs, sans que rien ne le dise |
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

⛔ **Le décor plein écran interceptait tout.** Une couche `position: fixed; inset: 0` couvre la
fenêtre : sans `pointer-events: none`, elle avale **chaque clic du site documentaire** — liens,
sélecteur de langue, formulaire à venir. Le correctif était écrit d'emblée, mais c'est un test
dédié qui le tient, parce que rien ne le signalerait autrement : la page reste parfaitement normale
à l'œil.

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

### 5.5 Ce que P5-04 laisse ouvert

| Sujet | État |
|---|---|
| La scène est **vide** | P5-05 la remplira ; ce qui est livré ici est le montage |
| Aucun garde n'interdit `three` dans le socle | **P5-09** : la mesure existe (les cinq chunks sont propres), le **garde** reste à écrire |
| Le divorce banc dev / banc prod | **Ouvert**, §5.4 — trois tests rouges en dev, verts en production |
| `matchMedia` lu une seule fois | Toujours vrai : basculer « Réduire les animations » en cours de session ne se voit qu'au rechargement. Les requêtes sont exportées pour qu'un abonnement soit possible sans recopier les chaînes |
