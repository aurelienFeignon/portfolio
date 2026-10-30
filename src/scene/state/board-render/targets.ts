/**
 * Les **cibles** de la carte mère (P8-15f, `carte-mere.md` §8) : ce que le pointeur désigne, où
 * mène un clic, et le geste qui y mène.
 *
 * ⭐ Séparé de `relations.ts` à dessein : `SceneMount` (chemin de première visite) lit
 * `hrefOf` et `sectionOf`, et ne doit tirer ni `layout.ts` ni la géométrie de la carte (P6-02,
 * `scene-state-stays-off-layout.test.ts`). Ce module n'importe que `routing`.
 *
 * ⭐ La route reste la seule source de vérité (§3) : un clic rend un `href` que la scène confie
 * à `router.push`, jamais un cadrage.
 *
 * Module pur : ni Three.js, ni `Date`, ni `Math.random`.
 */
import type { Locale } from '../../../i18n/locales.ts'
import { entityPath, sectionPath } from '../../../routing/paths.ts'
import type { Section } from '../../../routing/sections.ts'

/**
 * Au-delà de ce déplacement (pixels) entre l'appui et le relâché, un geste est une rotation ou
 * un défilement, pas un clic. Seuil hérité de NEXUS (D11), qui l'avait fixé le premier.
 */
export const CLICK_TOLERANCE_PX = 6

/** Ce que le pointeur peut désigner sur la carte. */
export type BoardTarget =
  | { readonly kind: 'chip'; readonly slug: string }
  | { readonly kind: 'processor'; readonly slug: string }
  | { readonly kind: 'year'; readonly year: number }
  | { readonly kind: 'segment'; readonly experience: string }

/**
 * Où mène un clic (§8) : un processeur à la fiche du projet, un tronçon à celle de l'expérience,
 * une puce à la page des compétences (il n'existe pas de fiche par compétence). Une année ne
 * mène nulle part : elle ne fait qu'allumer.
 */
export function hrefOf(target: BoardTarget, locale: Locale): string | null {
  switch (target.kind) {
    case 'processor':
      return entityPath(locale, 'projects', target.slug)
    case 'segment':
      return entityPath(locale, 'experiences', target.experience)
    case 'chip':
      return sectionPath(locale, 'skills')
    case 'year':
      return null
  }
}

/** La section que la cible met en valeur — l'étiquette et l'ambiance qui s'avivent. */
export function sectionOf(target: BoardTarget): Section {
  switch (target.kind) {
    case 'chip':
      return 'skills'
    case 'processor':
      return 'projects'
    default:
      return 'experiences'
  }
}

/** Une clé stable par cible (comparaison, mémo) ; la chaîne vide sans cible. */
export function targetKey(target: BoardTarget | null): string {
  if (target === null) return ''
  switch (target.kind) {
    case 'chip':
    case 'processor':
      return `${target.kind}:${target.slug}`
    case 'year':
      return `year:${target.year}`
    case 'segment':
      return `segment:${target.experience}`
  }
}

/**
 * Un appui terminé sur `tapped`, alors que `current` est allumé. À la souris, le clic navigue
 * tout de suite (le survol a déjà allumé). Au toucher, il n'y a pas de survol (§8, choix du
 * constructeur) : **le premier toucher allume, le second sur la même cible navigue** ; toucher
 * à côté éteint.
 */
export function tap(
  current: BoardTarget | null,
  tapped: BoardTarget | null,
  pointerType: string,
): { readonly hover: BoardTarget | null; readonly navigate: boolean } {
  if (tapped === null) return { hover: null, navigate: false }
  if (pointerType !== 'touch') return { hover: tapped, navigate: true }
  return { hover: tapped, navigate: targetKey(current) === targetKey(tapped) }
}
