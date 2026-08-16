/**
 * Ce que le responsive mesure, écrit **une fois** (P4-11).
 *
 * ⛔⛔ **Deux lecteurs du même token avaient déjà divergé** — dans le commit qui
 * les écrit. Le balayage de `desktop-chromium` lisait `--tap-target-min` en
 * gardant le suffixe (`raw.endsWith('rem')`), celui de `mobile-safari`
 * multipliait sans condition : exprimer le token en `px` faisait calculer 704 à
 * l'un et 44 à l'autre, donc rougir toutes les cibles d'une page conforme.
 * C'est la classe exacte que ce dépôt traque, dans son propre outillage de
 * mesure. Relevé en revue.
 */
import type { Page } from '@playwright/test'

import { expect } from '@playwright/test'

/**
 * La hauteur minimale d'une cible tactile, **en pixels**, lue dans le token.
 *
 * ⚠️ Le seuil n'est jamais recopié dans un parcours : `--tap-target-min` est la
 * source, et un test qui écrirait « 44 » défendrait l'ancienne valeur en silence
 * le jour où le token change.
 */
export async function tapTargetMinimum(page: Page): Promise<number> {
  const minimum = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement)
    const raw = root.getPropertyValue('--tap-target-min').trim()
    const value = Number.parseFloat(raw)

    // `rem` et `em` se rapportent à une taille de police ; `px` est déjà la
    // mesure. Une unité inconnue rend `NaN`, que l'assertion ci-dessous refuse —
    // mieux vaut un test qui s'arrête qu'un test qui compare à `NaN`.
    if (raw.endsWith('rem') || raw.endsWith('em')) {
      return value * Number.parseFloat(root.fontSize)
    }
    return raw.endsWith('px') ? value : Number.NaN
  })

  expect(
    minimum,
    '`--tap-target-min` est illisible : ce parcours ne mesurerait rien',
  ).toBeGreaterThan(0)

  return minimum
}

/**
 * Les cibles trop courtes de la page affichée.
 *
 * ⚠️ **Le lien d'évitement est mesuré comme les autres, et c'est voulu.** Une
 * première rédaction prétendait l'exclure par sa hauteur — faux : il est replié
 * par `transform: translateY(-150%)`, ce qui laisse sa boîte intacte. Il tient
 * le seuil sur ses propres mérites, et le prétendre exclu aurait masqué le jour
 * où il ne le tiendrait plus. Relevé en revue.
 *
 * Le filtre sur une hauteur nulle reste : il écarte ce qui n'est pas rendu du
 * tout, et rien d'autre.
 */
export async function shortTapTargets(page: Page, minimum: number): Promise<string[]> {
  return page.locator('a[href], button:not([disabled])').evaluateAll(
    (nodes, floor) =>
      nodes
        .filter((node) => {
          const box = node.getBoundingClientRect()
          return box.height > 0 && box.height < floor - 0.5
        })
        .map((node) => `${node.tagName.toLowerCase()} « ${node.textContent?.trim()} »`),
    minimum,
  )
}

/** De combien la page glisse latéralement — 0 quand elle tient. */
export async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
}

/**
 * Les blocs de texte dont le contenu dépasse leur boîte.
 *
 * ⚠️ **Le périmètre est le document, pas le `main`.** La première rédaction ne
 * regardait que `main …`, c'est-à-dire tout sauf l'en-tête et le pied de page —
 * qui sont ses **frères** dans le layout racine. Or c'est précisément là qu'un
 * rognage est invisible au contrôle de débordement : un `overflow: hidden` sur
 * une bannière absorbe le dépassement, la page ne glisse plus, et le texte est
 * coupé. Relevé en revue.
 */
export async function clippedText(page: Page): Promise<string[]> {
  return page
    .locator('p, li, h1, h2, h3, a, span')
    .evaluateAll((nodes) =>
      nodes
        .filter((node) => node.scrollWidth - node.clientWidth > 1)
        .map((node) => `${node.tagName.toLowerCase()} « ${node.textContent?.slice(0, 40)} »`),
    )
}
