/**
 * Le crochet de démarrage (P10-07) : la configuration de l'envoi est dite au journal avant toute
 * visite, et seulement dans le runtime Node.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { register } from '@/instrumentation'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('register', () => {
  it('dit, dans le runtime Node, comment l’envoi du CV est configuré', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs')
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    await register()
    expect(error).toHaveBeenCalledWith(expect.stringMatching(/^\[resume\] expéditeur : /))
  })

  it('ne fait rien dans le runtime Edge', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'edge')
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    await register()
    expect(error).not.toHaveBeenCalled()
  })
})
