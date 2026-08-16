/**
 * Le bloc `<script type="application/ld+json">` (P4-09).
 *
 * **Pourquoi un test de composant et pas seulement une fonction pure.** Ce qui
 * est en jeu ici n'est pas la sérialisation d'un objet — `JSON.stringify` la
 * fait — mais ce que le **parseur HTML** voit du texte produit. Cela ne
 * s'observe qu'une fois le nœud dans un document.
 */
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { JsonLd } from '@/ui/json-ld'

function scriptOf(data: unknown): HTMLScriptElement {
  render(<JsonLd data={data} />)
  const script = document.querySelector('script[type="application/ld+json"]')

  expect(script).not.toBeNull()
  return script as HTMLScriptElement
}

describe('JsonLd', () => {
  it('déclare le type que les moteurs de recherche lisent', () => {
    // Sans ce type exact, le bloc est du JavaScript pour le navigateur et
    // n'est lu par aucun moteur : il serait présent, et sans effet.
    expect(scriptOf({ '@type': 'Thing' }).type).toBe('application/ld+json')
  })

  it('rend un JSON que l’on peut relire', () => {
    const script = scriptOf({ '@type': 'Person', name: 'Aurélien Feignon' })

    expect(JSON.parse(script.textContent ?? '')).toEqual({
      '@type': 'Person',
      name: 'Aurélien Feignon',
    })
  })

  it('n’est pas rendu du tout quand il n’y a rien à dire', () => {
    // Un `<script>` vide ou porteur d'un graphe vide déclarerait des données
    // structurées qui n'en sont pas — un moteur les lit, et n'y trouve rien.
    render(<JsonLd data={null} />)

    expect(document.querySelector('script[type="application/ld+json"]')).toBeNull()
  })

  describe('un texte de contenu ne peut pas fermer le bloc', () => {
    /*
     * ⛔⛔ **`JSON.stringify` n'échappe pas `<`.** Un titre contenant
     * `</script>` produirait donc cette séquence **littéralement** dans le
     * document : le parseur HTML fermerait le bloc à cet endroit, et le reste du
     * graphe — un objet JSON — se retrouverait rendu comme du texte visible sur
     * la page.
     *
     * ⚠️ Ce n'est pas une faille de sécurité ici : `content/` est du code, écrit
     * par le propriétaire du dépôt et versionné avec lui (`phase-2-log.md` §6.1).
     * C'est un mode de panne — et il est silencieux, ce qui suffit.
     */
    it('échappe la séquence qui fermerait le script', () => {
      const script = scriptOf({ name: 'Un titre </script> piégé' })

      expect(script.innerHTML).not.toContain('</script>')
    })

    it('et le JSON reste lisible tel quel', () => {
      // L'échappement doit être **du JSON**, pas une mutilation du texte : un
      // consommateur relit la valeur d'origine, caractère pour caractère.
      const script = scriptOf({ name: 'Un titre </script> piégé' })

      expect(JSON.parse(script.textContent ?? '')).toEqual({ name: 'Un titre </script> piégé' })
    })
  })
})
