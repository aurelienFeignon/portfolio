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

| Contenu du chunk | Minifié | **gzip** |
|---|---|---|
| `three` seul | 712,8 Ko | **184,2 Ko** |
| `three` + R3F | 888,9 Ko | **241,5 Ko** |
| `three` + R3F + drei, **imports ciblés** | 879,5 Ko | **238,4 Ko** |
| `three` + R3F + drei **entier** (`export *`) | 2 655,8 Ko | **802,8 Ko** |

⛔⛔⛔ **Importer `drei` en entier coûte 2,5 fois le seuil bloquant de la phase.** Importé par
composant nommé, il coûte **moins que rien** — 238,4 contre 241,5 Ko, l'écart étant du bruit de
secouage d'arbre. La différence entre une phase qui tient son budget et une phase qui l'explose
tient donc à **la forme des imports**, pas au choix des paquets.

⛔⛔ **Et `three` seul consomme déjà 184 Ko, soit 84 % de la cible de 220 Ko** — avant la première
ligne de R3F. La cible n'est pas atteignable avec la distribution standard de `three` ; le seuil
**bloquant de 320 Ko**, lui, est tenu avec 25 % de marge. Voir l'arbitrage §1.6.

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
| **La cible de 220 Ko pour le chunk 3D** | **À trancher par l'exploitant.** `three` seul en consomme 84 % : la cible est hors d'atteinte sans un `three` sur mesure. Recommandé — **la porter à 245 Ko** (le mesuré + une marge de 3 %) et garder le **seuil bloquant à 320**, plutôt que conserver une cible que rien ne peut atteindre et que tout le monde apprendra à ignorer | Un `three` sur mesure, ou une version qui allège la distribution standard |
| **`drei` importé par composant nommé, jamais en entier** | **Contrainte dure**, pas une préférence : 238 Ko contre 803. Doit devenir un **garde** en P5-02 ou P5-09, pas une consigne de revue | — |
| **Vérifier la matrice hors du dépôt** | Bac à sable jetable, aucune dépendance ajoutée : P5-01 devait pouvoir conclure **NO-GO** sans laisser de trace à défaire | — |

### 1.7 Verdict

**GO pour P5-02**, aux versions vérifiées ci-dessus, et sous les deux contraintes du §1.6.

⚠️ Ce que P5-01 **ne** dit **pas** : rien sur le comportement dans **Next 16.3** — l'import dynamique
`ssr: false`, le découpage réel des chunks et l'absence du chemin critique sont P5-04 et P5-09. Le
bac à sable prouve la compatibilité des paquets entre eux, pas leur intégration au site.

⭐ **Rejouable** : les quatre mesures tiennent dans un répertoire jetable — un `package.json` aux
versions exactes, un `tsconfig.json` reprenant les options du dépôt, une scène, et deux scripts
(`node render.mjs`, `node bundle.mjs`). Aucune n'a besoin du dépôt.
