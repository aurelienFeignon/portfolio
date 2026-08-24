# `src/scene/components` — Rendu React Three Fiber

**Responsabilité** : `Canvas`, bureau, écrans, caméra — le seul endroit qui touche Three.js — et la frontière d'erreur qui fait tomber la scène en `none` sans un mot au visiteur (P5-07).
**Peut importer** : `scene/state`, `scene/capability`, `routing`, `i18n`. Exclu de la mesure de couverture (couvert par les E2E).
