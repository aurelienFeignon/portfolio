/**
 * P5-03 — l'adaptateur, éprouvé sur des navigateurs qui n'existent pas ici.
 *
 * ⭐ Il reçoit sa source en argument : c'est ce qui rend testables Safari (pas de
 * `deviceMemory`), un mobile en économie de données, ou une machine dont WebGL
 * est désactivé par configuration — trois environnements qu'aucun banc ne peut
 * produire, et jsdom moins que tout autre, lui qui n'implémente pas WebGL.
 */
import { describe, expect, it, vi } from 'vitest'

import { type CapabilitySource, readCapability } from '@/scene/capability/adapter'

type Contexte = { getExtension?: (nom: string) => unknown }

/** Un navigateur décrit par ce qu'il répond, pas par ce qu'il est. */
function source({
  contextes = ['webgl2'],
  medias = ['(pointer: fine)'],
  navigator = {},
  canvasLeve = false,
  getContextLeve = false,
  perte,
}: {
  contextes?: readonly string[]
  medias?: readonly string[]
  navigator?: CapabilitySource['navigator']
  canvasLeve?: boolean
  getContextLeve?: boolean
  perte?: () => void
} = {}): CapabilitySource {
  const contexte: Contexte = {
    getExtension: (nom) => (nom === 'WEBGL_lose_context' && perte ? { loseContext: perte } : null),
  }
  return {
    matchMedia: (query) => ({ matches: medias.includes(query) }),
    navigator,
    document: {
      createElement: () => {
        if (canvasLeve) throw new Error('createElement indisponible')
        return {
          getContext: (type: string) => {
            if (getContextLeve) throw new Error('WebGL désactivé par configuration')
            return contextes.includes(type) ? contexte : null
          },
        }
      },
    },
  }
}

describe('readCapability — WebGL', () => {
  it.each([
    ['WebGL2 disponible', ['webgl2', 'webgl'], 'webgl2'],
    ['WebGL1 seul', ['webgl'], 'webgl1'],
    ['aucun contexte', [], 'none'],
  ])('%s → %s', (_libelle, contextes, attendu) => {
    expect(readCapability(source({ contextes })).webgl).toBe(attendu)
  })

  it('traite une exception de `getContext` comme une absence — certains navigateurs lèvent', () => {
    expect(readCapability(source({ getContextLeve: true })).webgl).toBe('none')
  })

  it('traite un `createElement` en échec comme une absence', () => {
    expect(readCapability(source({ canvasLeve: true })).webgl).toBe('none')
  })

  it('⛔ REND le contexte aussitôt obtenu : un contexte retenu est un contexte volé à la scène', () => {
    const perte = vi.fn()

    readCapability(source({ perte }))

    expect(perte).toHaveBeenCalledOnce()
  })

  it('ne s’effondre pas si l’extension de libération est absente', () => {
    expect(() => readCapability(source())).not.toThrow()
  })
})

describe('readCapability — pointeur et mouvement', () => {
  it.each([
    ['pointeur fin', ['(pointer: fine)'], 'fine'],
    ['pointeur grossier', ['(pointer: coarse)'], 'coarse'],
    ['aucun pointeur', [], 'none'],
  ])('%s → %s', (_libelle, medias, attendu) => {
    expect(readCapability(source({ medias })).pointer).toBe(attendu)
  })

  it('lit `prefers-reduced-motion`', () => {
    const medias = ['(pointer: fine)', '(prefers-reduced-motion: reduce)']

    expect(readCapability(source({ medias })).prefersReducedMotion).toBe(true)
  })
})

describe('⛔⛔ readCapability — ce que les navigateurs ne fournissent pas', () => {
  it('rend `null` là où Firefox et Safari ne mesurent rien, jamais zéro', () => {
    const lu = readCapability(source({ navigator: {} }))

    expect(lu.deviceMemoryGb).toBeNull()
    expect(lu.logicalCores).toBeNull()
    expect(lu.saveData).toBe(false)
  })

  it('lit les mesures quand elles existent', () => {
    const navigator = { deviceMemory: 4, hardwareConcurrency: 12, connection: { saveData: true } }

    expect(readCapability(source({ navigator }))).toMatchObject({
      deviceMemoryGb: 4,
      logicalCores: 12,
      saveData: true,
    })
  })

  it('ne prend `saveData` pour vrai que s’il l’est explicitement', () => {
    const navigator = { connection: {} }

    expect(readCapability(source({ navigator })).saveData).toBe(false)
  })
})
