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
| `scene-state.ts` | **Les deux sens du flux d'ADR-0002** : `resolveSceneState(pathname)` (P6-01) et `getRouteForScreen(focus, locale)` (P6-03), inverses l'un de l'autre — ils vivent ensemble pour la raison que `routing` applique déjà à `homePath`/`localeFromPathname`. ⭐ La **lecture** de l'URL n'est pas ici : `parsePagePath` vit dans `routing`, contre `pathFor`. Ce fichier ne porte que les décisions de scène |

⚠️ **À venir en Phase 6** : `getCameraTarget(state)` (P6-02), qui consommera `SCENE_FOCUSES` pour
tenir son exhaustivité par un `Record<SceneFocus, ViewId>`.

⭐⭐ **La règle de découpage n'est pas « un fichier par fonction », c'est l'empreinte d'import** :
*rien sur le chemin de première visite ne doit tirer `layout.ts`*. `getCameraTarget` l'importe, et
`resolveSceneState` sera lue depuis ce chemin (P6-07, `data-scene-focus`) — les deux ne peuvent donc
pas cohabiter. `getRouteForScreen` ne touche que `routing` : elle cohabite, et c'est la démonstration que la règle
porte bien sur l'empreinte et non sur la forme. *Un module est
indivisible du point de vue d'un bundler* (P5-08, 0,5 Ko vérifiés en source maps), et c'est
`scripts/check-scene-isolation.mts` qui mesure la propriété, avec témoin — pas une règle de forme.

⛔ Ce README a annoncé les trois comme existantes jusqu'au 2026-08-25, alors qu'aucune n'était
écrite — un inventaire faux dans le sens rassurant, corrigé en P5-08. Il n'en annonce plus que ce
que le tableau ci-dessus ne porte pas encore.
