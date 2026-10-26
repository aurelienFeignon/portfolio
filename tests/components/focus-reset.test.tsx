/**
 * Le point de départ du focus après une navigation client (P7-05).
 *
 * ⚠️ jsdom ne connaît ni la navigation séquentielle ni `:focus-visible` : ce qui
 * se juge ici est le geste — où va le focus, ce qui reste des attributs, la
 * sélection. Le Tab suivant, l'anneau et l'annonce sont tenus par E2E-15
 * (`tests/e2e/profiles/scene-mounted/navigation-focus.spec.ts`).
 */
import { afterEach, describe, expect, it } from 'vitest'

import { resetFocusToDocumentStart } from '@/routing/focus-reset'

afterEach(() => {
  document.body.innerHTML = ''
  document.body.removeAttribute('tabindex')
  window.location.hash = ''
})

describe('resetFocusToDocumentStart', () => {
  it('rend le focus à `<body>` sans en faire un arrêt de tabulation', () => {
    document.body.innerHTML = '<a href="/fr/projects">Projets</a>'
    document.querySelector('a')?.focus()

    resetFocusToDocumentStart(document)

    expect(document.activeElement).toBe(document.body)
    expect(document.body).not.toHaveAttribute('tabindex')
  })

  it('rend le `tabindex` que `<body>` portait déjà', () => {
    document.body.setAttribute('tabindex', '0')

    resetFocusToDocumentStart(document)

    expect(document.body).toHaveAttribute('tabindex', '0')
  })

  it('part de la cible du fragment quand l’URL en porte un', () => {
    document.body.innerHTML = '<a href="/fr">accueil</a><main id="main">contenu</main>'
    window.location.hash = '#main'

    resetFocusToDocumentStart(document)

    const main = document.getElementById('main')
    expect(document.activeElement).toBe(main)
    expect(main).not.toHaveAttribute('tabindex')
  })

  it('retombe sur `<body>` quand le fragment ne désigne rien', () => {
    window.location.hash = '#absent'

    resetFocusToDocumentStart(document)

    expect(document.activeElement).toBe(document.body)
  })

  it('vide la sélection, qui désignerait un contenu disparu', () => {
    document.body.innerHTML = '<p>ancien contenu</p>'
    const plage = document.createRange()
    plage.selectNodeContents(document.querySelector('p') as HTMLElement)
    document.getSelection()?.addRange(plage)

    resetFocusToDocumentStart(document)

    expect(document.getSelection()?.rangeCount).toBe(0)
  })
})
