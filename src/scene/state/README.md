# `src/scene/state` — État de scène, pur

**Responsabilité** : `resolveSceneState`, `getCameraTarget`, `getRouteForScreen` — fonctions pures de l'URL, testables en Vitest sans WebGL (CT-10).
**Peut importer** : `routing`, `i18n`. **Zéro import Three.js**, vérifié par le lint.
