/**
 * Sonde externe de disponibilité — P4-14, risque R-15.
 *
 * ## Ce que le conteneur ne peut pas voir de lui-même
 *
 * L'image porte un `HEALTHCHECK` depuis P1-13, et `deploy.sh` l'attend avant de
 * déclarer un déploiement réussi. Il interroge `http://127.0.0.1:3000/` **depuis
 * l'intérieur du conteneur** : il ne dit donc rien de la zone DNS, du proxy
 * Cloudflare, de Caddy, du réseau `edge`, ni du fait que la machine soit
 * allumée. Un VPS éteint a un healthcheck parfaitement silencieux.
 *
 * ⛔ **C'est exactement R-15** : « service à terre sans que je le sache ». Ce
 * script est la moitié qui manquait — il regarde le site **depuis l'extérieur**,
 * par le même chemin qu'un visiteur, et son code de sortie est ce qui déclenche
 * l'alerte (`.github/workflows/uptime.yml`).
 *
 * ## Pourquoi `/robots.txt`, et pas l'accueil
 *
 * Le site est fermé au public par **Cloudflare Access** depuis le 2026-08-15
 * (`deploy/README.md` §4.2) : une requête anonyme sur n'importe quelle URL reçoit
 * une **302 vers `cloudflareaccess.com`**, produite par Cloudflare — donc verte
 * même quand le conteneur est arrêté. Une sonde qui l'accepterait mesurerait
 * Cloudflare et pas le site.
 *
 * ⭐ `/robots.txt` porte une application Access dédiée en politique **Bypass**
 * (`deploy/README.md` §7.2) : c'est le seul chemin que l'origine sert
 * anonymement. Il est servi par l'application elle-même (`src/app/robots.ts`),
 * donc une réponse conforme prouve toute la chaîne — DNS, Cloudflare, Caddy,
 * réseau `edge`, conteneur, rendu Next.
 *
 * ## Ce que la sonde vérifie, et ce qu'elle refuse de supposer
 *
 * 1. **200, sans suivre les redirections.** Une 3xx signifie qu'Access s'est
 *    remis en travers — la sonde ne verrait plus rien du site, et se croirait
 *    verte en suivant la redirection.
 * 2. **La directive `Sitemap:` porte l'origine de production.** C'est ce qui
 *    distingue *notre* `robots.txt` de celui que **Cloudflare sert lui-même**
 *    (« Content Signals ») et d'une image construite avec la mauvaise
 *    `SITE_URL` — deux pannes qui rendent 200.
 *
 * ⛔⛔⛔ **Le second contrôle n'est pas un raffinement : il est TOUT le travail,
 * et c'est mesuré.** Le 2026-08-17, conteneur volontairement arrêté sur le VPS :
 *
 * ```text
 * site debout : GET /robots.txt → 200, « Sitemap: https://aurelienfeignon.com/… » présente
 * site ARRÊTÉ : GET /robots.txt → 200, directive ABSENTE
 * ```
 *
 * Cloudflare **compose la réponse à sa périphérie** : quand l'origine répond, il
 * lui ajoute ses signaux ; quand elle est morte, il sert ses signaux **seuls**,
 * en 200. Une sonde jugée sur le statut aurait donc été **verte sur un site
 * éteint** — exactement la panne que R-15 décrit. Ce que le corps prouve, le
 * statut ne le prouve pas.
 *
 * ⭐⭐ **Ne retirez pas ce contrôle en simplifiant.** `uptime-probe.test.ts` le
 * tient avec le corps managé **réellement observé** pendant cet arrêt.
 *
 * ⚠️ **Ce qu'elle ne surveille PAS, et pourquoi ce n'est pas un oubli.** Aucun
 * relevé d'expiration de certificat : le site étant proxifié, le certificat
 * présenté à l'extérieur est celui de **Cloudflare**, qu'il renouvelle seul —
 * mesurer ses jours restants donnerait un contrôle qui promet « TLS surveillé »
 * en observant ce qui ne peut pas casser. Le certificat qui peut réellement
 * expirer est celui de **Caddy sur l'origine**, invisible d'ici ; en mode *Full
 * (strict)*, son expiration fait répondre Cloudflare en **526**, que ce script
 * nomme. Un statut 52x est donc le relevé TLS, et il est mesuré au bon endroit.
 */
// ⭐ La seule dépendance de ce script, et elle est **interne** : `site-url.ts`
// n'importe rien lui-même, donc la sonde reste exécutable sans `pnpm install` —
// propriété dont dépend `.github/workflows/uptime.yml`.
import { buildAbsoluteUrl, parseSiteUrl } from '../src/seo/site-url.ts'

/**
 * ⛔ **L'origine surveillée n'est PAS lue dans `SITE_URL`, et c'est délibéré.**
 * Cette variable désigne « l'origine du site que ce processus sert » : elle vaut
 * `http://localhost:3000` dans le conteneur de développement, et la sonde y a
 * mesuré le mauvais site à sa première exécution. Une sonde interroge une
 * adresse **publique**, qui ne dépend d'aucun environnement.
 *
 * ⭐ Elle est donc écrite ici, comme `check-dns.mts` écrit le domaine de la zone —
 * les deux sondes de ce dossier regardent le même hôte depuis dehors, chacune
 * avec sa propre déclaration. Ce n'est pas une seconde source à accorder avec la
 * `SITE_URL` de `ci.yml` : c'est une déclaration **indépendante**, et leur
 * désaccord est exactement ce que la directive `Sitemap:` ci-dessous rend
 * visible — une image construite avec une autre origine fait rougir la sonde au
 * lieu de servir en silence.
 *
 * ⭐ L'origine se surcharge par **argument**, jamais par l'environnement, et
 * uniquement pour les tests : un argument s'écrit au site d'appel et ne s'hérite
 * pas d'un conteneur, d'un dépôt ou d'une organisation. C'est précisément la
 * forme de la panne que ce commentaire raconte, refermée au lieu d'être
 * déplacée sous un autre nom.
 */
const SITE = parseSiteUrl(process.argv[2] ?? 'https://aurelienfeignon.com')

const PROBE_URL = buildAbsoluteUrl(SITE, '/robots.txt')

/**
 * ⭐⭐ **Attendue par la fonction qui l'émet.** `src/app/robots.ts` construit sa
 * directive avec exactement `buildAbsoluteUrl(…, '/sitemap.xml')` : la sonde ne
 * recopie donc pas une forme, elle la **dérive de la même source**. Une chaîne
 * écrite à la main ici défendrait l'ancienne forme le jour où celle du site
 * change, en silence — c'est la faute que ce dépôt traque depuis §7.
 */
const EXPECTED_SITEMAP = `Sitemap: ${buildAbsoluteUrl(SITE, '/sitemap.xml')}`

/**
 * Deux tentatives, pas une. Une alerte qu'un hoquet réseau suffit à déclencher
 * finit par ne plus être lue, et une sonde qui crie pour rien est pire qu'aucune
 * sonde. Le délai est réglable **pour les tests**, qui n'ont aucune raison
 * d'attendre — l'environnement peut le porter sans risque : il gouverne la
 * vitesse de la vérification, jamais ce qui est vérifié.
 */
const ATTEMPTS = 2
const RETRY_DELAY_MS = Number(process.env['UPTIME_RETRY_DELAY_MS'] ?? 15_000)
const TIMEOUT_MS = 15_000

/**
 * Les codes que Cloudflare produit **lui-même** quand l'origine ne répond plus.
 * Sans cette table, une panne rendrait « statut 526 » — exact et inexploitable.
 * Avec elle, l'alerte nomme la jambe cassée.
 */
const CLOUDFLARE_ORIGIN_ERRORS: Record<number, string> = {
  520: 'réponse inintelligible de l’origine',
  521: 'origine injoignable — Caddy arrêté, ou le pare-feu CF-ORIGIN a dérivé',
  522: 'délai de connexion à l’origine dépassé — VPS éteint ou saturé',
  523: 'origine introuvable — zone DNS ou routage',
  524: 'l’origine a accepté la connexion sans jamais répondre',
  525: 'poignée de main TLS refusée par l’origine',
  526: 'certificat de l’origine invalide ou EXPIRÉ — renouvellement Caddy en échec',
}

type Verdict = { ok: boolean; detail: string }

/**
 * Le verdict est **pur** : il ne connaît ni le réseau ni l'horloge. Le script ne
 * fait rien d'autre que lui apporter une réponse HTTP.
 *
 * ⚠️ Il n'est pas exporté, et son test ne l'importe pas : ce module **agit** dès
 * qu'on le charge. Il est éprouvé comme les autres gates du dépôt — exécuté en
 * sous-processus contre un serveur de fixture, ce qui vérifie aussi le code de
 * sortie, c'est-à-dire ce qui déclenche réellement l'alerte.
 */
function verdictFor(status: number, location: string | null, body: string): Verdict {
  if (status >= 300 && status < 400) {
    const target = location ?? '(sans en-tête Location)'
    const access = target.includes('cloudflareaccess.com')
      ? ' — Cloudflare Access intercepte ce chemin : la politique Bypass de deploy/README.md §7.2 a disparu, et la sonde ne voit plus le site'
      : ''
    return { ok: false, detail: `${status} vers ${target}${access}` }
  }

  const cloudflare = CLOUDFLARE_ORIGIN_ERRORS[status]
  if (cloudflare !== undefined) return { ok: false, detail: `${status} — ${cloudflare}` }

  if (status !== 200) return { ok: false, detail: `${status} au lieu de 200` }

  if (!body.includes(EXPECTED_SITEMAP)) {
    return {
      ok: false,
      detail:
        `200, mais la directive « ${EXPECTED_SITEMAP} » est absente du corps servi — ` +
        `ce n’est pas le robots.txt de l’application (Cloudflare sert le sien, ` +
        `ou l’image a été construite avec une autre SITE_URL). Reçu : ` +
        `${JSON.stringify(body.slice(0, 120))}`,
    }
  }

  return { ok: true, detail: `200, et la directive « ${EXPECTED_SITEMAP} » est servie` }
}

async function probe(url: string): Promise<Verdict> {
  try {
    const response = await fetch(url, {
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'user-agent': 'portfolio-uptime-probe (P4-14)' },
    })
    return verdictFor(response.status, response.headers.get('location'), await response.text())
  } catch (error) {
    // Connexion refusée, DNS mort, délai dépassé : aucune réponse HTTP n'existe,
    // et c'est la panne la plus grave — celle que le healthcheck du conteneur ne
    // peut par construction jamais voir.
    return { ok: false, detail: `aucune réponse — ${(error as Error).message}` }
  }
}

async function probeUntilSettled(): Promise<Verdict> {
  for (let attempt = 1; ; attempt += 1) {
    const verdict = await probe(PROBE_URL)
    console.log(`  ${verdict.ok ? '✓' : '✗'} tentative ${attempt}/${ATTEMPTS} : ${verdict.detail}`)
    if (verdict.ok || attempt === ATTEMPTS) return verdict
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
  }
}

console.log(`Sonde externe — ${PROBE_URL}\n`)

const verdict = await probeUntilSettled()

if (verdict.ok) {
  console.log(`\n✓ Le site répond depuis l’extérieur.`)
} else {
  console.error(
    `\n✗ LE SITE NE RÉPOND PAS depuis l’extérieur — ${verdict.detail}\n` +
      `\n  Le healthcheck du conteneur ne couvre pas ce cas : il interroge` +
      `\n  127.0.0.1 depuis l’intérieur du conteneur (P1-13).\n` +
      `\n  Quoi regarder, dans cet ordre (deploy/README.md §7.3, commandes §4) :` +
      `\n    1. l’état de la pile   : ssh portfolio 'SSH_ORIGINAL_COMMAND=status /srv/portfolio/deploy.sh'` +
      `\n    2. les journaux        : ssh portfolio 'docker compose -f /srv/portfolio/docker-compose.yml logs --tail 100 web'` +
      `\n    3. le retour arrière   : ssh portfolio 'SSH_ORIGINAL_COMMAND=rollback /srv/portfolio/deploy.sh'`,
  )
  // `process.exit()` abandonne les écritures en attente quand la sortie est un
  // tuyau — ce qu'elle est en CI. La leçon est celle de P4-13 §20.7.
  process.exitCode = 1
}
