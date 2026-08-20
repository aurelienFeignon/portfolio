/**
 * P5-02 — le garde qui tient la contrainte d'ADR-0016 : `drei` s'importe
 * composant par composant.
 *
 * ⭐⭐ **Pourquoi un test, et pas une vérification manuelle.** La règle a été vue
 * rouge à l'écriture ; cela ne prouve rien pour demain. En configuration plate,
 * un second bloc `no-restricted-syntax` visant les mêmes fichiers **remplace**
 * le tableau d'options entier : le garde cesse alors de rapporter, **lint reste
 * vert**, et rien ne le dit. C'est exactement la panne muette que ce dépôt
 * traque — un garde désarmé se lit comme un garde satisfait.
 *
 * ⭐ Le test lit la configuration **réelle** du dépôt, pas une copie : c'est le
 * comportement en vigueur qui est éprouvé, pas une intention recopiée.
 *
 * ⚠️ Ce que ce garde ne couvre pas, et c'est écrit dans la règle : l'import
 * global coûte 802,8 Ko, mais **quatre composants nommés en coûtent déjà 303,7**
 * — 95 % de la cible. Un garde syntaxique attrape une forme, jamais une
 * quantité. La mesure du chunk réel est P5-04 / P5-09.
 */
import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

const eslint = new ESLint({ cwd: process.cwd() })

async function violationsDe(code: string): Promise<string[]> {
  const [resultat] = await eslint.lintText(code, {
    filePath: `${process.cwd()}/src/scene-fictive.tsx`,
  })
  return (resultat?.messages ?? [])
    .filter((message) => message.ruleId === 'no-restricted-syntax')
    .map((message) => message.message)
}

describe('drei s’importe composant par composant (ADR-0016)', () => {
  it.each([
    [
      'un import de namespace',
      "import * as drei from '@react-three/drei'\nexport const x = drei\n",
    ],
    [
      'un import de namespace sur un sous-chemin',
      "import * as drei from '@react-three/drei/native'\nexport const x = drei\n",
    ],
    ['un réexport global', "export * from '@react-three/drei'\n"],
    [
      // La forme que P5-04 va écrire : le canvas est monté dynamiquement.
      'un import dynamique du paquet entier',
      "export const charger = async () => await import('@react-three/drei')\n",
    ],
  ])('refuse %s', async (_libelle, code) => {
    const violations = await violationsDe(code)

    expect(violations).toHaveLength(1)
    expect(violations[0]).toContain('ADR-0016')
  })

  it('laisse passer un import nommé, qui est la forme prescrite', async () => {
    const violations = await violationsDe(
      "import { Center } from '@react-three/drei'\nexport const C = Center\n",
    )

    expect(violations).toEqual([])
  })

  it('nomme le coût dans le message, pour que le refus s’explique seul', async () => {
    const [message] = await violationsDe(
      "import * as drei from '@react-three/drei'\nexport const x = drei\n",
    )

    expect(message).toContain('802,8 Ko')
  })
})
