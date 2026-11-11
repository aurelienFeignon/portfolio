import { describe, expect, it } from 'vitest'

import { parseSourceRevision, SOURCE_REVISION_ENV } from '@/seo/source-revision'

const SHA = '0123456789abcdef0123456789abcdef01234567'

describe('parseSourceRevision', () => {
  it('rend un SHA complet tel quel', () => {
    expect(parseSourceRevision(SHA)).toBe(SHA)
  })

  // Un build local ou le serveur de développement n'ont rien à annoncer.
  it.each([undefined, ''])('rend null quand la révision est absente (%o)', (raw) => {
    expect(parseSourceRevision(raw)).toBeNull()
  })

  // Un SHA abrégé, une majuscule ou un nom de branche feraient conclure la sonde
  // à tort : l'en-tête doit désigner un commit exact, ou rien.
  it.each([SHA.slice(0, 12), SHA.toUpperCase(), 'main', `${SHA}\n`])(
    'refuse une révision mal formée (%o) en le disant',
    (raw) => {
      expect(() => parseSourceRevision(raw)).toThrow(
        new RegExp(`${SOURCE_REVISION_ENV} doit être un SHA de commit complet`),
      )
    },
  )
})
