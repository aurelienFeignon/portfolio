# `src/scene/state` — État et données de scène, purs

**Responsabilité** : tout ce que la scène décide ou décrit **sans rendu** — testable en Vitest sans
WebGL (CT-10), couverture exigée à 95 %.
**Peut importer** : `routing`, `i18n`. **Zéro import Three.js**, vérifié par le lint.

| Fichier | Ce qu'il porte |
|---|---|
| `layout.ts` | Les constantes de la scène : `PALETTE`, `TONES`, le vocabulaire des vues (`ViewId`, `CameraSpec`), `transitionMs`, `ORBIT_LIMITS`, `PARALLAX`, les paliers (`DensityTier`, `BOARD_DENSITY`) et `BUS_WIRES`. ⭐ **Plus aucun cadrage** depuis le retrait de NEXUS (P8-15h) : ils sont calculés par `make board` dans le plan versionné (`BoardFile.cameras`) |
| `camera-motion.ts` | Le mouvement de caméra en nombres purs (P6-04) : interpolation interruptible, orbite bornée, parallaxe, cadrage dans la zone libre, recul quand le champ bute — ce que `components/camera-rig.tsx` applique image par image |
| `framing.ts` | La correction de champ quand l'écran n'est pas en 16:9, et son plafond (P5-06) |
| `diagnostics.ts` | Ce que le panneau de diagnostic affiche, et la cadence des relevés (P5-08) |
| `debug-flag.ts` | L'aiguillage `?debug=scene`, **et rien d'autre** : il est lu depuis le chunk de première visite, où le reste n'a pas à entrer (P5-08 §9.6) |
| `camera-target.ts` | `getCameraTarget(state, cameras)` (P6-02, P8-15c) : **le seul endroit où `SceneFocus` rencontre `ViewId`**, par un `Record<SceneFocus, ViewId>` dont le **type** tient l'exhaustivité. Les cadrages sont ceux du plan de carte chargé (`BoardFile.cameras`) ; rend leur instance elle-même, `fov` à 16:9 — la correction de format est celle de P6-04, sur la valeur interpolée |
| `ambient-motion.ts` | `ambientFrame` (P8-12) : une image du mouvement ambiant — temps des shaders **accumulé**, jamais lu sur l'horloge de R3F, image bornée, mise en valeur des sections (route ou survol) indépendante de la cadence ; lu par `board-scene.tsx` |
| `scene-state.ts` | **Les deux sens du flux d'ADR-0002** : `resolveSceneState(pathname)` (P6-01) et `getRouteForScreen(focus, locale)` (P6-03), inverses l'un de l'autre (`getRouteForScreen` est l'inverse *de section* ; les clics sur la carte passent par `hrefOf`, ADR-0002 amendement P8-15) — ils vivent ensemble pour la raison que `routing` applique déjà à `homePath`/`localeFromPathname`. ⭐ La **lecture** de l'URL n'est pas ici : `parsePagePath` vit dans `routing`, contre `pathFor`. Ce fichier ne porte que les décisions de scène |
| `plane.ts` | Le plan 2D de la carte (`Vec2`, `Rect`, `rectOf`, `inflate`, `rectCenter`, `rectContains`, `EPSILON`, `GRID`) : module **neutre**, dont `board/` et `board-render/` importent tous deux les valeurs — `board/rect.ts` le réexporte |
| `seeded-random.ts` | Le générateur pseudo-aléatoire à graine (P8-14), sorti de la géométrie de NEXUS (retirée en P8-15h) ; la seule source de déterminisme de la carte |
| `board/` | Le plan de la carte mère (P8-14), pur : `content`, `rect`, `timeline` (bus), `processors`, `zones`, `grid` (routeur A*), `traces`, `bounds`, `passives`, `plan` (`planBoard`) et `cameras`. ⭐ **Rien sur le chemin de première visite n'en importe une valeur** — gardé par `scene-state-stays-off-layout.test.ts` |
| `board-render/` | Ce que la scène lit du plan engendré par `make board` : `file-format` (`BoardFile`, `isBoardFile`, P8-15b) et `load` (P8-15c — un chargeur par locale, un chunk par fichier ; un plan périmé ou d'une autre locale lève une `StaleBoardFileError`, module à part — `stale-board-file-error.ts` —, que `SceneBoundary` range en `chunk` par son type) ; `polyline` (point répété, longueur, distance à un tronçon : une définition pour rubans, impulsions et lancer de rayon) ; `geometry` (P8-15d — toutes les pistes en un ruban, le bus en un autre, une forme par `InstancedMesh`, `drawCallBudget` ≤ 60) et `silkscreen` (ce que la sérigraphie écrit et où : années et repères seulement, ADR-0004) ; `relations` (P8-15f — ce qu'allume un survol, la cible sous le pointeur, les niveaux d'allumage par instance et par sommet) et `targets` (les cibles, `hrefOf`, le geste souris/toucher — sans `layout.ts`, car `SceneMount` le lit au chemin de première visite). Aucune valeur de `board/` ; `BOARD_DENSITY` et `BUS_WIRES` vivent dans `layout.ts` pour cette raison |

⭐⭐ **La règle de découpage n'est pas « un fichier par fonction », c'est l'empreinte d'import** :
*rien sur le chemin de première visite ne doit tirer `layout.ts`*. `getCameraTarget` l'importait
jusqu'à P8-15c (il reçoit désormais ses cadrages), et `resolveSceneState` est lue depuis ce chemin
(P6-07, `data-scene-focus`) — les deux ne pouvaient donc pas cohabiter. `getRouteForScreen` ne touche que `routing` : elle cohabite, et c'est la démonstration que la règle
porte bien sur l'empreinte et non sur la forme. *Un module est
indivisible du point de vue d'un bundler* (P5-08, 0,5 Ko vérifiés en source maps).
⛔ **`scripts/check-scene-isolation.mts` ne garde PAS cette règle** — il ne cherche que `three`, et
`layout.ts` n'en importe pas. C'est `tests/integration/scene-state-stays-off-layout.test.ts` qui la
tient : graphe d'imports de **valeur** depuis `scene-mount.tsx` (le chemin de première visite
d'aujourd'hui) et `scene-state.ts` (celui de P6-07), avec témoin (P6-02). Étendre
`check-scene-isolation.mts` à `layout.ts`, pour le mesurer aussi sur le build, est à faire avec P6-07.

⛔ Ce README a annoncé les trois comme existantes jusqu'au 2026-08-25, alors qu'aucune n'était
écrite — un inventaire faux dans le sens rassurant, corrigé en P5-08. Il n'en annonce plus que ce
que le tableau ci-dessus ne porte pas encore.
