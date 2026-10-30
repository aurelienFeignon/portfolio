# `src/scene/state` — État et données de scène, purs

**Responsabilité** : tout ce que la scène décide ou décrit **sans rendu** — testable en Vitest sans
WebGL (CT-10), couverture exigée à 95 %.
**Peut importer** : `routing`, `i18n`. **Zéro import Three.js**, vérifié par le lint.

| Fichier | Ce qu'il porte |
|---|---|
| `layout.ts` | Le plan coté du bureau : matériaux, nœuds, champs de touches, lumières, cadrages. **Aucune cote ne s'écrit ailleurs** (P5-05) |
| `geometry.ts` | Les deux géométries que `three` ne fournit pas — boîte chanfreinée, capuchon de touche — construites en positions et indices, sans un import de `three` |
| `framing.ts` | La correction de champ quand l'écran n'est pas en 16:9, et son plafond (P5-06) |
| `diagnostics.ts` | Ce que le panneau de diagnostic affiche, et la cadence des relevés (P5-08) |
| `debug-flag.ts` | L'aiguillage `?debug=scene`, **et rien d'autre** : il est lu depuis le chunk de première visite, où le reste n'a pas à entrer (P5-08 §9.6) |
| `camera-target.ts` | `getCameraTarget(state, cameras)` (P6-02, P8-15c) : **le seul endroit où `SceneFocus` rencontre `ViewId`**, par un `Record<SceneFocus, ViewId>` dont le **type** tient l'exhaustivité. Les cadrages sont ceux du plan de carte chargé (`BoardFile.cameras`) ; rend leur instance elle-même, `fov` à 16:9 — la correction de format est celle de P6-04, sur la valeur interpolée |
| `ambient-motion.ts` | `ambientFrame` (P8-12) : une image du mouvement ambiant de NEXUS — temps des shaders **accumulé**, jamais lu sur l'horloge de R3F, image bornée, surbrillance et survol indépendants de la cadence |
| `scene-state.ts` | **Les deux sens du flux d'ADR-0002** : `resolveSceneState(pathname)` (P6-01) et `getRouteForScreen(focus, locale)` (P6-03), inverses l'un de l'autre — ils vivent ensemble pour la raison que `routing` applique déjà à `homePath`/`localeFromPathname`. ⭐ La **lecture** de l'URL n'est pas ici : `parsePagePath` vit dans `routing`, contre `pathFor`. Ce fichier ne porte que les décisions de scène |
| `seeded-random.ts` | Le générateur pseudo-aléatoire à graine (P8-14), sorti de la géométrie de NEXUS pour que NEXUS et la carte partagent la même source de déterminisme |
| `board/` | Le plan de la carte mère (P8-14), pur : `content`, `rect`, `timeline` (bus), `processors`, `zones`, `grid` (routeur A*), `traces`, `bounds`, `passives`, `plan` (`planBoard`) et `cameras`. ⭐ **Rien sur le chemin de première visite n'en importe une valeur** — gardé par `scene-state-stays-off-layout.test.ts` |
| `board-render/` | Ce que la scène lit du plan engendré par `make board` : `file-format` (`BoardFile`, `isBoardFile`, P8-15b) et `load` (P8-15c — un chargeur par locale, un chunk par fichier ; un plan périmé ou d'une autre locale lève une `ChunkLoadError`) ; `geometry` (P8-15d — toutes les pistes en un ruban, le bus en un autre, une forme par `InstancedMesh`, `drawCallBudget` ≤ 60) et `silkscreen` (ce que la sérigraphie écrit et où : années et repères seulement, ADR-0004) ; `relations` (P8-15f — ce qu'allume un survol, la cible sous le pointeur, les niveaux d'allumage par instance et par sommet) et `targets` (les cibles, `hrefOf`, le geste souris/toucher — sans `layout.ts`, car `SceneMount` le lit au chemin de première visite). Aucune valeur de `board/` ; `BOARD_DENSITY` et `BUS_WIRES` vivent dans `layout.ts` pour cette raison |

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
