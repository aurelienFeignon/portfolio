/**
 * Les repères de la scène montée, partagés par les parcours qui l'exigent.
 *
 * ⭐ Un seul endroit pour le sélecteur de la racine, le témoin de navigation
 * client et le délai de première image : le dernier a été réglé par la mesure
 * (WebKit, charge d'hôte élevée), et une seconde copie aurait dérivé.
 */
import type { Page } from '@playwright/test'

import { expect } from './test'

export const RACINE = '[data-scene-root]'
export const CANVAS = `${RACINE} canvas`

/** Le canvas marqué par `monterLaScene` : il doit survivre aux navigations. */
export const TEMOIN = `${CANVAS}[data-temoin="meme-canvas"]`

/**
 * La première image, compilation des shaders comprise : sous WebKit et une
 * charge d'hôte élevée, elle a dépassé les 5 s par défaut (mesuré le 2026-10-27).
 */
export const PREMIERE_IMAGE_MS = 20_000

/**
 * Charge la page, attend le canvas, et le marque. ⛔ Le marqueur prouve qu'une
 * navigation suivante est CLIENT : un rechargement remettrait l'état et le focus
 * par construction, et ferait passer pour juste ce qui n'a rien prouvé.
 */
export async function monterLaScene(page: Page, chemin: string) {
  await page.goto(chemin)
  const canvas = page.locator(CANVAS)
  await expect(canvas).toBeAttached({ timeout: 10_000 })
  await canvas.evaluate((element) => element.setAttribute('data-temoin', 'meme-canvas'))
}

export function navigationPrincipale(page: Page) {
  return page.getByRole('navigation', { name: 'Navigation principale' })
}

/**
 * Écoute chaque valeur que `data-camera-transition` QUITTE : un `true` aussitôt
 * remplacé ne se perd pas, là où une lecture ponctuelle le manquerait.
 */
export async function ecouterLesTransitions(page: Page) {
  await page.locator(CANVAS).evaluate((element) => {
    const quittees: Array<string | null> = []
    Object.assign(window, { __transitions: quittees })
    new MutationObserver((changements) => {
      for (const changement of changements) quittees.push(changement.oldValue)
    }).observe(element, {
      attributes: true,
      attributeFilter: ['data-camera-transition'],
      attributeOldValue: true,
    })
  })
}

/** Les valeurs quittées depuis `ecouterLesTransitions`. */
export function transitionsQuittees(page: Page) {
  return page.evaluate(
    () => (window as unknown as { __transitions: Array<string | null> }).__transitions,
  )
}
