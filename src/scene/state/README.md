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
| `scene-state.ts` | `resolveSceneState(pathname)` — l'état de scène dérivé de l'URL, **et rien d'autre** (P6-01). Même raison que `debug-flag.ts` : le chunk de première visite la lira, et `getCameraTarget` importera `layout.ts` |

⚠️ **À venir en Phase 6** : `getCameraTarget(state)` (P6-02) et
`getRouteForScreen(screen, locale)` (P6-03). ⭐ **Elles n'iront pas dans `scene-state.ts`** :
`getCameraTarget` importe `layout.ts`, le plan coté entier, et `resolveSceneState` sera lue depuis
le chunk de première visite (P6-07). *Un module est indivisible du point de vue d'un bundler* —
c'est la leçon que P5-08 a payée, et la raison du découpage.

⛔ Ce README a annoncé les trois comme existantes jusqu'au 2026-08-25, alors qu'aucune n'était
écrite — un inventaire faux dans le sens rassurant, corrigé en P5-08. Il n'en annonce plus que ce
que le tableau ci-dessus ne porte pas encore.
