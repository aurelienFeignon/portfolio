# `src/scene/components` — Rendu React Three Fiber

**Responsabilité** : `Canvas`, carte mère (`board/`, P8-15), caméra — le seul endroit qui touche Three.js — et la frontière d'erreur qui fait tomber la scène en `none` sans un mot au visiteur (P5-07).

| Fichier | Ce qu'il porte |
|---|---|
| `scene-mount.tsx` | Le montage après `idle`, le palier, les étiquettes HTML hors de la racine (`aria-hidden`) — seul fichier, avec `scene-boundary.tsx`, à pouvoir importer `next` |
| `scene-boundary.tsx` | La frontière d'erreur : `chunk` (Turbopack `ChunkLoadError`, ou `StaleBoardFileError`) ou `render`, sans rien afficher |
| `scene-canvas.tsx` | Le `Canvas`, le chargement du plan de la locale, la perte de contexte WebGL |
| `camera-rig.tsx` | Applique `camera-motion.ts` image par image : transition, orbite, parallaxe, cadrage dans la zone libre |
| `use-lazy-import.ts` | `useLazyImport` : un module chargé dans un effet, jamais par `next/dynamic` (React #438 dans le `<Canvas>`), son erreur relancée au rendu pour `SceneBoundary` — le plan de carte et la sonde de diagnostic |
| `shader-warmup.tsx` | La compilation des shaders avant la première image (`compileAsync`) |
| `scene-diagnostics.tsx` | Le panneau `?debug=scene` |
| `board/` | La carte mère (P8-15) : plan chargé (`use-board-file`), maillages, matériaux, sérigraphie, étiquettes projetées |

⭐ NEXUS (`nexus/`, D11) a été retiré en P8-15h ; seuls le rig et le préchauffage des shaders, qui ne lui appartenaient pas, ont été conservés ici.
**Peut importer** : `scene/state`, `scene/capability`, `routing`, `i18n`. Exclu de la mesure de couverture (couvert par les E2E).
