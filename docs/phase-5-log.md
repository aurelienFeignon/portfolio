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
