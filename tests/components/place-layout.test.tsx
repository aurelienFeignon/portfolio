/**
 * Le layout d'un endroit, **rendu** (P4-10 — dette de P4-02).
 *
 * ⚠️ **Pourquoi ce fichier existe alors qu'un garde couvre déjà `PlaceLayout`.**
 * `every-section-declares-its-place.test.ts` **appelle** les quatre layouts sans
 * les rendre : il lit l'élément `PlaceLayout` retourné et vérifie la valeur
 * transmise. Le corps de `PlaceLayout` ne s'exécute donc jamais — d'où ses 0 %
 * de couverture, nommés en dette dans `phase-4-log.md` §13.8.
 *
 * Les deux ne mesurent pas la même chose et aucun ne remplace l'autre : là-bas,
 * *quel endroit chaque layout déclare* ; ici, *ce que le layout fait de cette
 * déclaration*.
 *
 * `PlaceLayout` est un composant serveur `async` : on l'**attend** pour obtenir
 * son élément, puis on rend celui-ci. C'est le seul moyen de l'exercer sous
 * jsdom, et cela n'ôte rien — ce qui est mesuré est bien son corps.
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PlaceLayout } from '@/app/[locale]/place-layout'

async function renderPlace(locale: string, current: 'home' | 'projects') {
  render(
    await PlaceLayout({
      params: Promise.resolve({ locale }),
      current,
      children: <p>Le contenu de la page</p>,
    }),
  )
}

describe('layout d’un endroit', () => {
  it('pose la bannière au-dessus du contenu qu’on lui confie', async () => {
    await renderPlace('fr', 'projects')

    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByText('Le contenu de la page')).toBeInTheDocument()
  })

  it('marque le lien de l’endroit courant, et lui seul', async () => {
    await renderPlace('fr', 'projects')

    // `true` et non `page` : le layout couvre aussi les pages de détail de la
    // section, où `page` annoncerait « page courante » sur un lien qui mène
    // ailleurs (P4-02 §7.1 bis).
    expect(screen.getByRole('link', { name: 'Projets' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('link', { name: 'Compétences' })).not.toHaveAttribute('aria-current')
  })

  it('construit ses liens dans la langue de l’URL', async () => {
    await renderPlace('en', 'projects')

    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '/en/projects')
  })

  it('refuse une locale inconnue plutôt que de rendre une page à moitié juste', async () => {
    await expect(
      PlaceLayout({
        params: Promise.resolve({ locale: 'de' }),
        current: 'home',
        children: null,
      }),
    ).rejects.toThrow()
  })
})
