/**
 * Le corps MDX **dans son conteneur** (P4-10 — dette de P4-05).
 *
 * ⭐⭐ **L'invariant que ce composant porte est indivisible** : *un corps compilé
 * est toujours rendu dans `.prose`*. Éclaté entre une route et un module CSS, il
 * n'était porté par rien — et il y aura un second appelant, les expériences
 * portant déjà des corps que leur fiche ne rend pas. Un appelant qui oublie
 * l'enveloppe obtient un **mur de texte**, sans erreur, sans test rouge : c'est
 * exactement ce que P4-05 a livré et qu'une revue a trouvé.
 *
 * `renderMdx` a ses propres tests (`mdx-render.test.tsx`) : ce fichier ne
 * remesure pas la compilation, il vérifie l'enveloppe et le passage du fichier.
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Prose } from '@/ui/mdx/prose'

const FILE = 'content/fr/projects/exemple.mdx'

describe('corps MDX', () => {
  it('rend le contenu dans un article, et non dans un conteneur anonyme', async () => {
    render(await Prose({ source: '# Un titre\n\nUn paragraphe.', file: FILE }))

    // `article` plutôt que `div` : c'est ce qui rend le corps désignable par son
    // rôle. Un test qui viserait `main p` serait satisfait par le seul résumé
    // de la page, qui n'est pas le corps.
    const article = screen.getByRole('article')

    expect(article).toBeInTheDocument()
    expect(article).toHaveTextContent('Un paragraphe.')
  })

  it('porte la classe qui donne son rythme vertical au corps', async () => {
    /*
     * ⛔ Le rythme vertical de P4-05 ne s'appliquait à rien — une question de
     * spécificité —, et la page phare de la tâche rendait un mur de texte avec
     * 496 tests verts. La classe est la seule prise qu'un test unitaire ait sur
     * cet invariant ; la géométrie, elle, se mesure en E2E.
     */
    render(await Prose({ source: 'Un paragraphe.', file: FILE }))

    expect(screen.getByRole('article').className).not.toBe('')
  })

  it('nomme le fichier fautif quand le corps est illisible', async () => {
    // `ContentError.file` est « ce qu'on ouvre dans l'éditeur » : un corps
    // refusé doit dire lequel, sans quoi l'auteur cherche à l'aveugle.
    await expect(Prose({ source: '<Danger />', file: FILE })).rejects.toThrow(FILE)
  })
})
