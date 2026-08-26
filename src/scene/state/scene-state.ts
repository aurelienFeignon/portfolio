/**
 * L'état de scène, dérivé de l'URL — P6-01, premier maillon d'ADR-0002.
 *
 * ```text
 * URL ──▶ resolveSceneState(pathname) ──▶ SceneState ──▶ getCameraTarget ──▶ caméra
 * ```
 *
 * La scène ne détient **aucun** état de navigation propre. Le bouton précédent, le
 * partage d'URL et l'ouverture directe fonctionnent donc par construction, et non
 * par correctif (R-03).
 *
 * ⭐⭐ **La lecture de l'URL n'est pas ici, et c'est la décision de conception de
 * cette tâche.** `parsePagePath` vit dans `src/routing/paths.ts`, contre `pathFor`
 * dont elle est l'inverse — c'est la place que ce dépôt donne déjà à
 * `localeFromPathname` contre `homePath`, pour la raison qu'il y écrit : *le jour
 * où l'un change, l'autre continue de répondre à l'ancienne question.* Ce fichier
 * ne garde que ce qui est une décision de **scène** : l'effondrement de tout ce
 * qui n'est pas un écran vers la vue d'ensemble.
 *
 * ⭐ **Ce module reste sans `layout.ts`, et c'est mesuré.** `getCameraTarget`
 * (P6-02) importera le plan coté du bureau entier, alors que `resolveSceneState`
 * sera lue depuis le chunk de **première visite** (P6-07, `data-scene-focus`).
 * *Un module est indivisible du point de vue d'un bundler* — ce que P5-08 a payé
 * en 0,5 Ko, vérifié dans les source maps. La règle n'est pas « un fichier par
 * fonction » mais **« rien sur le chemin de première visite ne tire `layout.ts` »**,
 * et c'est `scripts/check-scene-isolation.mts` qui la mesure, avec témoin.
 */
import { parsePagePath } from '../../routing/paths.ts'
import type { Section } from '../../routing/sections.ts'

/**
 * Les quatre états de la scène : la vue d'ensemble du bureau, et un écran par
 * section.
 *
 * ⭐ Il est **dérivé** de `Section`, jamais réécrit à côté. Une quatrième section
 * ajoutée à `routing` devient un focus sans que personne y pense, et le mapping
 * qui lui manquerait échoue au typage — c'est l'exhaustivité qu'exige ADR-0002.
 */
export type SceneFocus = 'overview' | Section

export interface SceneState {
  readonly focus: SceneFocus
  /**
   * Le slug que l'URL **nomme**, jamais une entité vérifiée.
   *
   * ⛔ Cette couche ne peut pas savoir si l'entité existe : `scene → content` est
   * interdit (`architecture.md` §1.2), et le contenu n'est de toute façon pas
   * descendu jusqu'au client. `/fr/projects/inexistant` rend donc
   * `{ focus: 'projects', detail: 'inexistant' }` alors que le proxy y affiche une
   * 404 — la caméra cadre l'écran Projets, c'est-à-dire la zone où le visiteur se
   * trouve réellement. Arbitrage tranché le 2026-08-26 (`phase-6-log.md` §3).
   */
  readonly detail: string | null
}

/**
 * La vue d'ensemble.
 *
 * ⭐ Constante de module, et non un littéral reconstruit : c'est la réponse de
 * **tous** les chemins de rejet, et son identité `===` permettra à P6-04 de
 * distinguer « rien n'a changé » sans comparer champ à champ.
 */
export const OVERVIEW: SceneState = { focus: 'overview', detail: null }

/**
 * L'état de scène que désigne un **chemin** — sans requête ni fragment, tel que
 * le rend `usePathname()`.
 *
 * ⭐⭐ **Tout ce qui n'est pas un écran est la vue d'ensemble**, et c'est la seule
 * décision que ce module prend. Elle recouvre deux cas que rien ne rapproche
 * ailleurs : l'accueil, qui est une page bien servie mais ne cadre aucun écran,
 * et les adresses que le site ne sert dans aucune langue, dont `parsePagePath`
 * rend `null`.
 *
 * ⛔ Elle ne recouvre **pas** le troisième cas, et c'est l'arbitrage de la tâche :
 * une adresse **servie en forme** dont l'entité n'existe pas garde sa section.
 * `detail` nomme ce que l'URL porte, il ne vérifie pas.
 */
export function resolveSceneState(pathname: string): SceneState {
  const page = parsePagePath(pathname)
  if (page === null) return OVERVIEW

  const { location } = page
  switch (location.kind) {
    case 'home':
      return OVERVIEW
    case 'section':
      return { focus: location.section, detail: null }
    case 'entity':
      return { focus: location.section, detail: location.slug }
  }
}
