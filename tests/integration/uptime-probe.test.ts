/**
 * P4-14 — la sonde externe, éprouvée sur les pannes qu'elle existe pour voir.
 *
 * Le script est **exécuté en sous-processus** contre un serveur de fixture, et
 * c'est son **code de sortie** qui est constaté : c'est lui, et rien d'autre,
 * qui fait échouer `.github/workflows/uptime.yml` et déclenche l'alerte. Un test
 * qui n'appellerait que la fonction de verdict laisserait sans preuve le seul
 * maillon qui alerte.
 *
 * ⭐ Chaque cas est une panne **réellement observable en production**, pas une
 * combinaison inventée : une 302 d'Access, les codes 52x que Cloudflare produit
 * quand l'origine ne répond plus, le `robots.txt` managé de Cloudflare qui
 * remplacerait le nôtre (réserve écrite dans `deploy/README.md` §4.2), et une
 * image construite avec la mauvaise `SITE_URL`.
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'

import { afterEach, describe, expect, it } from 'vitest'

import { SOURCE_REVISION_HEADER } from '@/seo/source-revision'

import { runScript, scriptPath, type ScriptResult } from './support/run-script'

const SCRIPT = scriptPath('check-uptime.mts')

type Handler = (request: IncomingMessage, response: ServerResponse, origin: string) => void

let close: (() => Promise<void>) | null = null

afterEach(async () => {
  await close?.()
  close = null
})

/** Un serveur éphémère qui joue le rôle de l'origine, port choisi par l'OS. */
async function serving(handler: Handler): Promise<string> {
  const server = createServer((request, response) => {
    handler(request, response, origin)
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  const origin = `http://127.0.0.1:${port}`
  close = () => new Promise<void>((resolve) => server.close(() => resolve()))
  return origin
}

/**
 * L'origine passe par ARGUMENT — elle ne doit pouvoir s'hériter de rien. Le
 * délai, lui, gouverne la vitesse et non ce qui est mesuré.
 */
function probe(origin: string, ...extra: string[]): Promise<ScriptResult> {
  return runScript(SCRIPT, [origin, ...extra], { ...process.env, UPTIME_RETRY_DELAY_MS: '0' })
}

/** Le `robots.txt` que l'application sert réellement (`src/app/robots.ts`). */
function ourRobots(origin: string): string {
  return `User-Agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`
}

/**
 * ⛔⛔⛔ **Le corps réellement servi le 2026-08-17, conteneur ARRÊTÉ** — pas une
 * fixture imaginée. Le pourquoi est raconté une seule fois, dans l'en-tête de
 * `scripts/check-uptime.mts` ; ici vit la preuve, pas le récit.
 */
const CLOUDFLARE_MANAGED_ONLY = [
  '# As a condition of accessing this website, you agree to abide by the following',
  '# content signals:',
  '',
  '# (a)  If a Content-Signal = yes, you may collect content for the corresponding',
  '#      use.',
  '',
  'User-agent: *',
  'Content-Signal: search=yes, ai-train=no',
  '',
  'User-agent: CCBot',
  'Disallow: /',
  '',
  '# END Cloudflare Managed Content',
  '',
].join('\n')

describe('sonde externe', () => {
  it('sort en 0 quand l’origine sert son propre robots.txt', async () => {
    const origin = await serving((_request, response, base) => {
      response.writeHead(200, { 'content-type': 'text/plain' })
      response.end(ourRobots(base))
    })

    const { code, output } = await probe(origin)

    expect(code).toBe(0)
    expect(output).toContain('Le site répond depuis l’extérieur')
  })

  it('accepte le corps FUSIONNÉ que la production sert réellement', async () => {
    // ⭐ L'autre moitié du cas mesuré : site debout, Cloudflare ajoute ses signaux
    // AU-DESSUS du fichier de l'origine. Ne tester que le fichier nu laisserait
    // la sonde crier sur la production — une fausse alerte est ce qui apprend à
    // ne plus lire les alertes.
    const origin = await serving((_request, response, base) => {
      response.writeHead(200).end(CLOUDFLARE_MANAGED_ONLY + ourRobots(base))
    })

    const { code, output } = await probe(origin)

    expect(code).toBe(0)
    expect(output).toContain('Le site répond depuis l’extérieur')
  })

  it('interroge /robots.txt, et rien d’autre', async () => {
    const seen: string[] = []
    const origin = await serving((request, response, base) => {
      seen.push(request.url ?? '')
      response.writeHead(200).end(ourRobots(base))
    })

    await probe(origin)

    expect(seen).toEqual(['/robots.txt'])
  })

  it('refuse une redirection d’Access au lieu de la suivre', async () => {
    // Le cas qui rendrait la sonde décorative : Cloudflare répond 302 même quand
    // le conteneur est arrêté. La suivre donnerait une page de connexion en 200.
    const origin = await serving((_request, response) => {
      response
        .writeHead(302, { location: 'https://augure.cloudflareaccess.com/cdn-cgi/access/login/x' })
        .end()
    })

    const { code, output } = await probe(origin)

    expect(code).toBe(1)
    expect(output).toContain('Cloudflare Access intercepte ce chemin')
    expect(output).toContain('LE SITE NE RÉPOND PAS')
  })

  it('signale une redirection étrangère sans l’imputer à Access', async () => {
    const origin = await serving((_request, response) => {
      response.writeHead(301, { location: 'https://ailleurs.example/' }).end()
    })

    const { code, output } = await probe(origin)

    expect(code).toBe(1)
    expect(output).toContain('301 vers https://ailleurs.example/')
    expect(output).not.toContain('Access')
  })

  it.each([
    [522, /VPS éteint/],
    [526, /certificat de l’origine invalide ou EXPIRÉ/],
    [521, /Caddy arrêté/],
  ])('nomme la jambe cassée derrière un %i de Cloudflare', async (status, expected) => {
    const origin = await serving((_request, response) => {
      response.writeHead(status).end()
    })

    const { code, output } = await probe(origin)

    expect(code).toBe(1)
    expect(output).toMatch(expected)
  })

  it('sort en 1 sur un statut quelconque, sans prétendre le diagnostiquer', async () => {
    const origin = await serving((_request, response) => {
      response.writeHead(503).end()
    })

    const { code, output } = await probe(origin)

    expect(code).toBe(1)
    expect(output).toContain('503 au lieu de 200')
  })

  it('voit le site éteint derrière la 200 de Cloudflare — la panne de R-15', async () => {
    // Le statut est identique à celui d'un site sain ; seul le corps distingue
    // les deux états (`scripts/check-uptime.mts`, en-tête).
    const origin = await serving((_request, response) => {
      response.writeHead(200, { 'content-type': 'text/plain' }).end(CLOUDFLARE_MANAGED_ONLY)
    })

    const { code, output } = await probe(origin)

    expect(code).toBe(1)
    expect(output).toContain('ce n’est pas le robots.txt de l’application')
  })

  it('refuse un robots.txt qui annonce une autre origine', async () => {
    // Une image construite avec la mauvaise `SITE_URL` sert des canoniques d'un
    // domaine et des liens d'un autre — sans que rien n'échoue (P4-13 §20.6).
    const origin = await serving((_request, response) => {
      response.writeHead(200).end('Sitemap: https://autre-domaine.example/sitemap.xml\n')
    })

    const { code, output } = await probe(origin)

    expect(code).toBe(1)
    expect(output).toContain('autre-domaine.example')
  })

  it('sort en 1 quand rien ne répond — la panne que le healthcheck ne voit pas', async () => {
    // Le gestionnaire ne sera jamais appelé : on n'emprunte au serveur que son
    // port, avant de le fermer.
    const origin = await serving(() => {})
    await close?.()
    close = null

    const { code, output } = await probe(origin)

    expect(code).toBe(1)
    expect(output).toContain('aucune réponse')
  })

  it('ne crie pas sur un hoquet : une seconde tentative suffit', async () => {
    // Une alerte qu'un incident réseau d'une seconde suffit à déclencher finit
    // par ne plus être lue.
    let calls = 0
    const origin = await serving((_request, response, base) => {
      calls += 1
      if (calls === 1) {
        response.writeHead(502).end()
        return
      }
      response.writeHead(200).end(ourRobots(base))
    })

    const { code, output } = await probe(origin)

    expect(code).toBe(0)
    expect(output).toContain('✗ tentative 1/2')
    expect(output).toContain('✓ tentative 2/2')
  })

  it('n’insiste pas indéfiniment, et dit quoi regarder', async () => {
    let calls = 0
    const origin = await serving((_request, response) => {
      calls += 1
      response.writeHead(500).end()
    })

    const { code, output } = await probe(origin)

    expect(code).toBe(1)
    expect(calls).toBe(2)
    // Une alerte muette oblige son lecteur à réinventer le diagnostic.
    expect(output).toContain('deploy.sh')
    expect(output).toContain('rollback')
  })
})

describe('sonde externe — déploiement manquant', () => {
  const MAIN = '1111111111111111111111111111111111111111'
  const OLD = '2222222222222222222222222222222222222222'
  const PAST_GRACE_S = 2 * 3600

  /**
   * L'origine sert notre `robots.txt` avec la révision `served` (ou sans
   * en-tête), et la sonde attend `MAIN`, fusionné il y a `ageS` secondes.
   */
  async function expecting(
    served: string | null,
    { ageS = PAST_GRACE_S, extra = [] as string[] } = {},
  ): Promise<ScriptResult> {
    const origin = await serving((_request, response, base) => {
      response.writeHead(200, served === null ? {} : { [SOURCE_REVISION_HEADER]: served })
      response.end(ourRobots(base))
    })
    const committedAt = String(Math.floor(Date.now() / 1000) - ageS)
    return probe(origin, '--expect-revision', MAIN, '--committed-at', committedAt, ...extra)
  }

  it('sort en 0 quand le site sert la tête de main', async () => {
    const { code, output } = await expecting(MAIN)

    expect(code).toBe(0)
    expect(output).toContain('révision servie = tête de main')
  })

  it('ne crie pas pendant que la CI déploie encore', async () => {
    // Une alerte à chaque fusion apprendrait à ne plus lire les alertes.
    const { code, output } = await expecting(OLD, { ageS: 10 * 60 })

    expect(code).toBe(0)
    expect(output).toContain('déploiement attendu')
  })

  it('sort en 1 quand main n’est toujours pas servi passé le délai — le 2026-11-10', async () => {
    const { code, output } = await expecting(OLD)

    expect(code).toBe(1)
    expect(output).toContain('DÉPLOIEMENT MANQUANT')
    expect(output).toContain(OLD.slice(0, 12))
    // Le site répond : l'accuser d'être à terre enverrait chercher la mauvaise panne.
    expect(output).not.toContain('LE SITE NE RÉPOND PAS')
    // Un écart de révision ne se résorbe pas en 15 s : pas de seconde tentative.
    expect(output).toContain('tentative 1/2')
    expect(output).not.toContain('tentative 2/2')
  })

  it('compte une image sans en-tête comme un déploiement manquant', async () => {
    const { code, output } = await expecting(null)

    expect(code).toBe(1)
    expect(output).toContain(`${SOURCE_REVISION_HEADER} absent`)
  })

  it('accepte la révision d’un rollback assumé', async () => {
    // Sans cela, un retour arrière délibéré ferait crier la sonde jusqu'à la
    // prochaine fusion.
    const { code, output } = await expecting(OLD, { extra: ['--accept-revision', OLD] })

    expect(code).toBe(0)
    expect(output).toContain('rollback assumé')
  })

  it('lit une révision acceptée VIDE comme aucune — la variable de dépôt non définie', async () => {
    const { code } = await expecting(OLD, { extra: ['--accept-revision', ''] })

    expect(code).toBe(1)
  })

  it('ignore l’en-tête quand le workflow ne fournit pas de tête de main', async () => {
    // Déclenchement manuel depuis une branche : rien à comparer.
    const origin = await serving((_request, response, base) => {
      response.writeHead(200, { [SOURCE_REVISION_HEADER]: OLD }).end(ourRobots(base))
    })

    const { code } = await probe(origin)

    expect(code).toBe(0)
  })

  it.each([[[]], [['--committed-at', '']]])(
    'refuse une révision attendue sans date exploitable (%o)',
    async (extra) => {
      // Sans date, « pas encore déployé » et « jamais déployé » se confondent ;
      // une date vide valait 0 — le 1er janvier 1970 — et faisait crier la sonde.
      const origin = await serving(() => {})

      const { code, output } = await probe(origin, '--expect-revision', MAIN, ...extra)

      expect(code).not.toBe(0)
      expect(output).toContain('vont ensemble')
    },
  )

  it('nomme l’option fautive, pas une variable que la sonde ne lit pas', async () => {
    const origin = await serving(() => {})

    const { code, output } = await probe(
      origin,
      '--expect-revision',
      MAIN.slice(0, 12),
      '--committed-at',
      '0',
    )

    expect(code).not.toBe(0)
    expect(output).toContain('--expect-revision doit être un SHA de commit complet')
    expect(output).not.toContain('SOURCE_REVISION')
  })
})
