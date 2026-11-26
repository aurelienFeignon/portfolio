/**
 * Le parcours d'une demande de CV (P10-06) : validation, pièges, limites, envoi.
 *
 * Tout est injecté — faux expéditeur, limiteurs en mémoire sur horloge fixe —, donc aucun chemin
 * ne joint le réseau ni le disque.
 */
import { describe, expect, it } from 'vitest'

import { FakeResumeSender } from '@/features/resume/fake-resume-sender'
import { MemoryRateLimiter } from '@/features/resume/memory-rate-limiter'
import type { RateLimiter } from '@/features/resume/rate-limiter'
import {
  ipBucket,
  parseResumeOutcome,
  requestResume,
  RESUME_LIMITS,
  type ResumeRequestDeps,
  type ResumeSubmission,
} from '@/features/resume/request-resume'
import { ResumeRefusedError } from '@/features/resume/resume-sender'
import { HONEYPOT_FIELD, MIN_FILL_MS, RENDERED_AT_FIELD } from '@/features/resume/schema'

const NOW = 1_800_000_000_000

function setup(overrides: Partial<ResumeRequestDeps> = {}) {
  const sender = new FakeResumeSender()
  const logs: string[] = []
  const deps: ResumeRequestDeps = {
    sender,
    visitorLimiter: new MemoryRateLimiter(() => NOW),
    globalLimiter: new MemoryRateLimiter(() => NOW),
    now: () => NOW,
    hash: (value) => `h(${value})`,
    log: (message) => logs.push(message),
    ...overrides,
  }
  return { sender, logs, deps }
}

function submission(form: Record<string, unknown> = {}, ip: string | null = '203.0.113.7') {
  return {
    form: {
      email: 'Visiteur@Example.test',
      [RENDERED_AT_FIELD]: String(NOW - MIN_FILL_MS),
      [HONEYPOT_FIELD]: '',
      ...form,
    },
    locale: 'fr',
    ip,
  } satisfies ResumeSubmission
}

/** Un limiteur qui consigne les clés vues : pour vérifier ce qui est compté, et dans quel ordre. */
function recording(inner: RateLimiter): RateLimiter & { keys: string[]; released: string[] } {
  const keys: string[] = []
  const released: string[] = []
  return {
    keys,
    released,
    consume(key, rule) {
      keys.push(key)
      return inner.consume(key, rule)
    },
    release(key) {
      released.push(key)
      return inner.release(key)
    },
  }
}

/** Un limiteur dont la seule réponse est fixée par le test. */
const fixed = (consume: RateLimiter['consume']): RateLimiter => ({
  consume,
  release: async () => {},
})

describe('requestResume', () => {
  it('envoie le CV dans la langue de la page, à l’adresse en minuscules', async () => {
    const { sender, deps } = setup()
    expect(await requestResume(submission(), deps)).toBe('sent')
    expect(sender.sent).toEqual([{ email: 'visiteur@example.test', locale: 'fr' }])
  })

  it('ignore une langue saisie dans le formulaire : seule celle du serveur compte', async () => {
    const { sender, deps } = setup()
    expect(await requestResume(submission({ locale: 'de' }), deps)).toBe('sent')
    expect(sender.sent[0]?.locale).toBe('fr')
  })

  it('signale une adresse invalide, sans rien compter', async () => {
    const global = recording(new MemoryRateLimiter(() => NOW))
    const { sender, deps } = setup({ globalLimiter: global })
    expect(await requestResume(submission({ email: 'pas-une-adresse' }), deps)).toBe('invalid')
    expect(sender.sent).toEqual([])
    expect(global.keys).toEqual([])
  })

  it.each([
    ['honeypot rempli', { [HONEYPOT_FIELD]: 'robot' }],
    ['soumis trop vite', { [RENDERED_AT_FIELD]: String(NOW - MIN_FILL_MS + 1) }],
    ['horodatage absent', { [RENDERED_AT_FIELD]: undefined }],
  ])('répond comme à un succès à un robot (%s), sans rien envoyer ni compter', async (_, form) => {
    const visitor = recording(new MemoryRateLimiter(() => NOW))
    const { sender, deps } = setup({ visitorLimiter: visitor })
    expect(await requestResume(submission(form), deps)).toBe('sent')
    expect(sender.sent).toEqual([])
    expect(visitor.keys).toEqual([])
  })

  it('est indisponible sans expéditeur, sans entamer les limites', async () => {
    const global = recording(new MemoryRateLimiter(() => NOW))
    const { deps } = setup({ sender: null, globalLimiter: global })
    expect(await requestResume(submission(), deps)).toBe('unavailable')
    expect(global.keys).toEqual([])
  })

  it('est indisponible sans plafond global persisté', async () => {
    const { sender, deps } = setup({ globalLimiter: null })
    expect(await requestResume(submission(), deps)).toBe('unavailable')
    expect(sender.sent).toEqual([])
  })

  it('limite par IP à 3 par heure : la 4e est refusée', async () => {
    const { sender, deps } = setup()
    for (let i = 0; i < RESUME_LIMITS.ipPerHour.limit; i++) {
      expect(await requestResume(submission({ email: `v${i}@example.test` }), deps)).toBe('sent')
    }
    expect(await requestResume(submission({ email: 'v9@example.test' }), deps)).toBe('limited')
    expect(sender.sent).toHaveLength(3)
  })

  it('limite par IP à 5 par jour, même quand l’heure est passée', async () => {
    let now = NOW
    const clock = () => now
    const { sender, deps } = setup({
      visitorLimiter: new MemoryRateLimiter(clock),
      globalLimiter: new MemoryRateLimiter(clock),
      now: clock,
    })
    const send = (i: number) =>
      requestResume(
        submission({ email: `v${i}@example.test`, [RENDERED_AT_FIELD]: String(now - MIN_FILL_MS) }),
        deps,
      )
    for (let i = 0; i < 3; i++) expect(await send(i)).toBe('sent')
    now += RESUME_LIMITS.ipPerHour.windowMs
    for (let i = 3; i < 5; i++) expect(await send(i)).toBe('sent')
    expect(await send(5)).toBe('limited')
    expect(sender.sent).toHaveLength(5)
  })

  it('répond comme à un succès au-delà de 2 envois pour une adresse : ne rien révéler d’un tiers', async () => {
    const { sender, deps } = setup()
    expect(await requestResume(submission({}, '198.51.100.1'), deps)).toBe('sent')
    expect(await requestResume(submission({}, '198.51.100.2'), deps)).toBe('sent')
    expect(await requestResume(submission({}, '198.51.100.3'), deps)).toBe('sent')
    expect(sender.sent).toHaveLength(2)
  })

  it('compte les adresses et les IP hachées, jamais en clair, plafond global avant l’adresse', async () => {
    const visitor = recording(new MemoryRateLimiter(() => NOW))
    const global = recording(new MemoryRateLimiter(() => NOW))
    const { deps } = setup({ visitorLimiter: visitor, globalLimiter: global })
    await requestResume(submission(), deps)
    expect(visitor.keys).toEqual([
      'ip-h:h(203.0.113.7)',
      'ip-j:h(203.0.113.7)',
      'email:h(visiteur@example.test)',
    ])
    expect(global.keys).toEqual(['global'])
  })

  it('compte sous une même clé les visiteurs sans IP connue, et le signale sans adresse', async () => {
    const visitor = recording(new MemoryRateLimiter(() => NOW))
    const { deps, logs } = setup({ visitorLimiter: visitor })
    await requestResume(submission({}, null), deps)
    expect(visitor.keys[0]).toBe('ip-h:h(inconnue)')
    expect(logs).toEqual(['[resume] IP du visiteur absente : limites par IP partagées'])
  })

  it('compte une IPv6 par son préfixe /64 : une rotation des bits bas ne donne pas de compteur neuf', async () => {
    const { sender, deps } = setup()
    for (let i = 1; i <= 4; i++) {
      await requestResume(submission({ email: `v${i}@example.test` }, `2001:db8:1:2::${i}`), deps)
    }
    expect(sender.sent).toHaveLength(RESUME_LIMITS.ipPerHour.limit)
  })

  it('ne consomme pas le créneau d’une adresse quand le plafond global refuse', async () => {
    let open = false
    const { sender, deps } = setup({
      globalLimiter: fixed(async () => ({ allowed: open })),
    })
    expect(await requestResume(submission({}, '198.51.100.1'), deps)).toBe('unavailable')
    expect(await requestResume(submission({}, '198.51.100.2'), deps)).toBe('unavailable')
    open = true
    expect(await requestResume(submission({}, '198.51.100.3'), deps)).toBe('sent')
    expect(sender.sent).toHaveLength(1)
  })

  it('n’entame pas le plafond global quand une limite d’IP refuse', async () => {
    const global = recording(new MemoryRateLimiter(() => NOW))
    const { deps } = setup({ globalLimiter: global })
    for (let i = 0; i < 4; i++)
      await requestResume(submission({ email: `v${i}@example.test` }), deps)
    expect(global.keys).toHaveLength(3)
  })

  it('est indisponible au plafond global atteint, sans rien envoyer', async () => {
    const { sender, deps } = setup({ globalLimiter: fixed(async () => ({ allowed: false })) })
    expect(await requestResume(submission(), deps)).toBe('unavailable')
    expect(sender.sent).toEqual([])
  })

  it('est indisponible si la limitation échoue, et ne journalise pas l’adresse', async () => {
    const failing = fixed(async () => {
      throw new TypeError('visiteur@example.test')
    })
    const { sender, logs, deps } = setup({ visitorLimiter: failing })
    expect(await requestResume(submission(), deps)).toBe('unavailable')
    expect(sender.sent).toEqual([])
    expect(logs).toEqual(['[resume] limitation de débit en échec : TypeError'])
  })

  it('est indisponible sur panne d’envoi, et ne journalise ni l’adresse ni le message', async () => {
    const { sender, logs, deps } = setup()
    sender.failWith(new Error('refus pour visiteur@example.test'))
    expect(await requestResume(submission(), deps)).toBe('unavailable')
    expect(logs).toEqual(['[resume] envoi en échec : Error'])
  })

  it('rend les créneaux de l’adresse et du plafond sur un refus certain, pas ceux de l’IP', async () => {
    const visitor = recording(new MemoryRateLimiter(() => NOW))
    const global = recording(new MemoryRateLimiter(() => NOW))
    const { sender, deps } = setup({ visitorLimiter: visitor, globalLimiter: global })
    sender.failWith(new ResumeRefusedError('refus'))
    expect(await requestResume(submission({}, '198.51.100.1'), deps)).toBe('unavailable')
    expect(visitor.released).toEqual(['email:h(visiteur@example.test)'])
    expect(global.released).toEqual(['global'])
  })

  it('garde les créneaux sur une panne ambiguë (délai dépassé) : le message a pu partir', async () => {
    const visitor = recording(new MemoryRateLimiter(() => NOW))
    const global = recording(new MemoryRateLimiter(() => NOW))
    const { sender, deps } = setup({ visitorLimiter: visitor, globalLimiter: global })
    sender.failWith(new DOMException('délai', 'TimeoutError') as unknown as Error)
    expect(await requestResume(submission(), deps)).toBe('unavailable')
    expect(visitor.released).toEqual([])
    expect(global.released).toEqual([])
  })

  it('après deux refus de Mailjet, la même adresse est encore servie : aucun « sent » à vide', async () => {
    const { sender, deps } = setup()
    sender.failWith(new ResumeRefusedError('refus'))
    expect(await requestResume(submission({}, '198.51.100.1'), deps)).toBe('unavailable')
    expect(await requestResume(submission({}, '198.51.100.2'), deps)).toBe('unavailable')
    sender.recover()
    expect(await requestResume(submission({}, '198.51.100.3'), deps)).toBe('sent')
    expect(sender.sent).toHaveLength(1)
  })

  it('décrit une panne qui n’est pas une erreur par son seul type', async () => {
    const { logs, deps } = setup({
      sender: {
        sendResume: () => Promise.reject('visiteur@example.test'),
      },
    })
    expect(await requestResume(submission(), deps)).toBe('unavailable')
    expect(logs).toEqual(['[resume] envoi en échec : string'])
  })
})

describe('parseResumeOutcome', () => {
  it.each(['sent', 'invalid', 'limited', 'unavailable'] as const)('reconnaît « %s »', (outcome) => {
    expect(parseResumeOutcome(outcome)).toBe(outcome)
  })

  it.each([undefined, '', 'SENT', 'autre', ['sent']])('ignore %j', (value) => {
    expect(parseResumeOutcome(value)).toBeNull()
  })
})

describe('ipBucket', () => {
  it.each([
    ['203.0.113.7', '203.0.113.7'],
    [' 203.0.113.7 ', '203.0.113.7'],
    ['::ffff:203.0.113.7', '203.0.113.7'],
    ['2001:DB8:0001:0002:aaaa:bbbb:cccc:dddd', '2001:db8:1:2::/64'],
    ['2001:db8:1:2::9', '2001:db8:1:2::/64'],
    ['2001:db8::1', '2001:db8:0:0::/64'],
    ['::1', '0:0:0:0::/64'],
    ['fe80::', 'fe80:0:0:0::/64'],
  ])('%s → %s', (ip, bucket) => {
    expect(ipBucket(ip)).toBe(bucket)
  })
})
