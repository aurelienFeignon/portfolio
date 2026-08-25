/**
 * P5-07 — la frontière d'erreur de la scène, éprouvée par une vraie erreur.
 *
 * **Pourquoi ici et pas en E2E.** Le banc E2E prouve l'échec du *chunk* et la
 * *perte de contexte*, qui se provoquent depuis un navigateur. Une exception
 * levée pendant le rendu de la scène, elle, ne se provoque contre l'image de
 * production qu'en fabriquant la panne — ce que ce dépôt refuse (`phase-4-log.md`
 * §12.5). Ici, le composant qui jette est écrit pour ça, et c'est honnête : ce
 * qu'on éprouve est la frontière, pas une panne inventée.
 *
 * ⚠️ React écrit l'erreur attrapée sur la console : c'est son comportement, pas
 * un défaut du test. Elle est réduite au silence pour que la sortie du banc
 * reste lisible — et **elle seule**.
 */
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SceneBoundary } from '@/scene/components/scene-boundary'

function Explose(): never {
  throw new Error('la scène a échoué')
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('frontière d’erreur de la scène', () => {
  it('laisse passer la scène tant que rien n’échoue', () => {
    const onFailure = vi.fn()

    render(
      <SceneBoundary onFailure={onFailure}>
        <p>le décor</p>
      </SceneBoundary>,
    )

    expect(screen.getByText('le décor')).toBeInTheDocument()
    expect(onFailure).not.toHaveBeenCalled()
  })

  it('⛔ n’affiche RIEN après une erreur — ni message, ni cadre, ni bouton', () => {
    // ADR-0003 point 5 : « aucun message anxiogène n'est affiché ». Une scène qui
    // tombe est un décor qui manque, pas une panne du site : le visiteur n'a rien
    // à en savoir, et le contraire transformerait un enrichissement raté en
    // incident visible.
    const { container } = render(
      <SceneBoundary onFailure={vi.fn()}>
        <Explose />
      </SceneBoundary>,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('distingue un chunk qui ne se charge pas d’une scène qui jette', () => {
    /*
     * ⭐ Le nom `ChunkLoadError` n'est pas supposé : il est **mesuré**. Le banc
     * E2E qui refuse le chunk du moteur l'a fait écrire par Turbopack en toutes
     * lettres dans la console — « ChunkLoadError: Failed to load chunk … It was
     * handled by the <SceneBoundary> error boundary » (`phase-5-log.md` §7.3).
     * La distinction ne change rien à ce que voit le visiteur ; elle change ce
     * qu'on peut dire le jour où un déploiement laisse un chunk derrière lui.
     */
    const onFailure = vi.fn()

    function ChunkAbsent(): never {
      const erreur = new Error('Failed to load chunk scene-canvas')
      erreur.name = 'ChunkLoadError'
      throw erreur
    }

    render(
      <SceneBoundary onFailure={onFailure}>
        <ChunkAbsent />
      </SceneBoundary>,
    )

    expect(onFailure).toHaveBeenCalledWith('chunk')
  })

  it('nomme la défaillance à son parent, une seule fois', () => {
    const onFailure = vi.fn()

    render(
      <SceneBoundary onFailure={onFailure}>
        <Explose />
      </SceneBoundary>,
    )

    expect(onFailure).toHaveBeenCalledTimes(1)
    expect(onFailure).toHaveBeenCalledWith('render')
  })
})
