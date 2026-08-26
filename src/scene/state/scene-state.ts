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
 * ⭐⭐ **Ce fichier ne porte QUE cette fonction, et c'est mesuré, pas esthétique.**
 * `getCameraTarget` (P6-02) devra importer `layout.ts` — le plan coté du bureau
 * entier. Or `resolveSceneState` sera lue par le montage de la scène, qui vit dans
 * le chunk de **première visite** (P6-07, `data-scene-focus`). Les loger ensemble
 * y ferait entrer tout `layout.ts` : *un module est indivisible du point de vue
 * d'un bundler*, ce que P5-08 a payé en 0,5 Ko et vérifié dans les source maps.
 */
import { isLocale, type Locale } from '../../i18n/locales.ts'
import { SECTIONS, routeSegments, type Section } from '../../routing/sections.ts'

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

/** La vue d'ensemble, exportée parce que trois appelants la comparent. */
export const OVERVIEW: SceneState = { focus: 'overview', detail: null }

/**
 * L'inverse de `segmentFor`, **par locale**.
 *
 * ⛔ Le segment ne peut pas être comparé à un littéral : `routeSegments` est
 * l'identité en v1 (ADR-0005), mais elle est précisément le point unique où la
 * traduction des segments aura lieu. Un `'projects'` écrit en dur ici cesserait de
 * résoudre le jour où `/fr/projets` existe, sans que rien ne le dise.
 */
function sectionForSegment(locale: Locale, segment: string): Section | null {
  const segments = routeSegments[locale]
  return SECTIONS.find((section) => segments[section] === segment) ?? null
}

/**
 * L'aller-retour de `encodeURIComponent`, que `entityPath` applique à tout slug.
 *
 * ⛔ Un échappement tronqué — `%E0%A4%A` — fait **jeter** `decodeURIComponent`.
 * Aucun encodage ne l'a produit, donc il ne désigne aucune entité : la section
 * reste, l'entité est nulle. Laisser l'exception remonter ferait tomber la scène
 * entière sur une adresse tapée à la main.
 */
function slugFromSegment(segment: string): string | null {
  try {
    return decodeURIComponent(segment)
  } catch {
    return null
  }
}

/**
 * L'état de scène que désigne un **chemin** — sans requête ni fragment, tel que
 * le rend `usePathname()`.
 *
 * ⭐⭐ **Elle lit la FORME de l'URL, jamais l'EXISTENCE de ce qu'elle nomme.** Une
 * forme qu'aucune route ne sert — locale inconnue, segment de section inconnu,
 * plus profond qu'une entité — rend la vue d'ensemble. Une forme servie rend sa
 * section, avec le nom que l'URL porte.
 */
export function resolveSceneState(pathname: string): SceneState {
  const [, locale = '', section = '', slug = '', ...reste] = pathname.split('/')

  if (!isLocale(locale) || reste.length > 0) return OVERVIEW

  const focus = sectionForSegment(locale, section)
  if (focus === null) return OVERVIEW

  // Une barre finale laisse un segment vide : `/fr/projects/` désigne la section,
  // pas une entité dont le nom serait la chaîne vide.
  return { focus, detail: slug === '' ? null : slugFromSegment(slug) }
}
