/**
 * « Employeur · Lieu » (P4-10 — dette de P4-04).
 *
 * ⚠️ **Une branche sur deux n'était pas exercée** — 75 % de branches, nommé en
 * dette dans `phase-4-log.md` §13.8. La branche couverte était celle de la
 * liste ; celle du `className` absent ne l'était par personne, alors que c'est
 * elle qui décide de la classe rendue.
 *
 * Ce composant existe parce que le séparateur orphelin — « Augure · » — est une
 * décision de présentation, et qu'elle était écrite **deux fois** : une fois
 * dans la liste, une fois dans la fiche.
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CompanyLine } from '@/ui/company-line'

describe('ligne « employeur · lieu »', () => {
  it('sépare l’employeur du lieu quand le lieu est connu', () => {
    render(<CompanyLine company="EVEA Conseil" location="Tours" />)

    expect(screen.getByText('EVEA Conseil · Tours')).toBeInTheDocument()
  })

  it('ne laisse **aucun séparateur orphelin** quand le lieu manque', () => {
    // `location` est facultatif au schéma : « Augure · » serait un défaut
    // visible, et c'est la seule raison d'être de ce composant.
    render(<CompanyLine company="Augure" />)

    expect(screen.getByText('Augure')).toBeInTheDocument()
    expect(screen.queryByText(/·/)).toBeNull()
  })

  it('compose la classe de l’appelant avec la sienne', () => {
    const { container } = render(<CompanyLine company="Augure" className="propre-a-la-fiche" />)
    const line = container.querySelector('p') as HTMLElement

    // La fiche porte sa propre taille sans redéclarer la règle : les deux
    // classes doivent coexister, pas se remplacer.
    expect(line.className.split(' ').length).toBe(2)
    expect(line.className).toContain('propre-a-la-fiche')
  })

  it('porte sa seule classe quand l’appelant n’en donne pas', () => {
    // ⚠️ **La branche qui manquait.** Sans elle, remplacer le ternaire par la
    // seule branche « avec classe » laissait la suite verte.
    const { container } = render(<CompanyLine company="Augure" />)
    const line = container.querySelector('p') as HTMLElement

    expect(line.className).not.toBe('')
    expect(line.className.split(' ')).toHaveLength(1)
  })
})
