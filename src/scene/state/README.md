# `src/scene/state` — État et données de scène, purs

**Responsabilité** : tout ce que la scène décide ou décrit **sans rendu** — testable en Vitest sans
WebGL (CT-10), couverture exigée à 95 %.
**Peut importer** : `routing`, `i18n`. **Zéro import Three.js**, vérifié par le lint.

| Fichier | Ce qu'il porte |
|---|---|
| `layout.ts` | Le plan coté du bureau : matériaux, nœuds, champs de touches, lumières, cadrages. **Aucune cote ne s'écrit ailleurs** (P5-05) |
| `geometry.ts` | Les deux géométries que `three` ne fournit pas — boîte chanfreinée, capuchon de touche — construites en positions et indices, sans un import de `three` |
| `diagnostics.ts` | Ce que le panneau de diagnostic affiche, et la cadence des relevés (P5-08) |
| `debug-flag.ts` | L'aiguillage `?debug=scene`, **et rien d'autre** : il est lu depuis le chunk de première visite, où le reste n'a pas à entrer (P5-08 §9.6) |

⚠️ **À venir en Phase 6** : `resolveSceneState(pathname)`, `getCameraTarget(state)`,
`getRouteForScreen(screen, locale)`. Ce README les annonçait comme existantes jusqu'au 2026-08-25,
alors qu'aucune n'était écrite — un inventaire faux dans le sens rassurant, corrigé en P5-08.
