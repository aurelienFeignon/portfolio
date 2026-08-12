/**
 * Vérification de la zone DNS et de l'authentification d'expédition — P1-17.
 *
 * Interroge des résolveurs publics par DNS-over-HTTPS plutôt que le résolveur
 * local : c'est ce que voit réellement un destinataire, et non ce qu'un cache
 * local a mémorisé. Deux résolveurs indépendants, pour ne pas confondre
 * « publié » et « propagé chez un seul opérateur ».
 *
 * Aucune dépendance : `fetch` natif.
 *
 * Ce que ce script NE peut pas vérifier, et qui reste à faire à la main :
 *   - le renouvellement automatique du domaine (tableau de bord du registraire) ;
 *   - la validation de l'expéditeur chez Mailjet (tableau de bord) ;
 *   - la réception réelle d'un message (P10-14).
 */

const DOMAIN = process.env['SITE_DOMAIN'] ?? 'aurelienfeignon.com'

const RESOLVERS = [
  { name: 'Google', url: 'https://dns.google/resolve' },
  { name: 'Cloudflare', url: 'https://cloudflare-dns.com/dns-query' },
]

type Check = {
  label: string
  name: string
  type: string
  verdict: (values: string[]) => { ok: boolean; detail: string }
}

async function resolve(resolver: (typeof RESOLVERS)[number], name: string, type: string) {
  const response = await fetch(`${resolver.url}?name=${name}&type=${type}`, {
    headers: { accept: 'application/dns-json' },
  })
  if (!response.ok) return []
  const body = (await response.json()) as { Answer?: { data: string; type: number }[] }
  return (body.Answer ?? []).map((answer) => answer.data.replace(/^"|"$/g, ''))
}

/**
 * Plages publiées par Cloudflare — même source que
 * `deploy/sync-cloudflare-origin-firewall.sh`, qui s'en sert pour n'autoriser
 * que Cloudflare sur l'origine. Les deux vérifient donc la même chose depuis
 * les deux bouts : que le trafic passe bien par le proxy et par lui seul.
 */
async function cloudflareRanges(): Promise<string[]> {
  const lists = await Promise.all(
    ['https://www.cloudflare.com/ips-v4', 'https://www.cloudflare.com/ips-v6'].map(async (url) => {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`plages Cloudflare indisponibles (${url})`)
      return (await response.text()).split('\n').filter((line) => line.trim() !== '')
    }),
  )
  return lists.flat().map((cidr) => cidr.trim())
}

/** Adresse IPv4 ou IPv6 en entier de 128 bits, pour comparer des préfixes. */
function toBigInt(address: string): bigint | null {
  if (address.includes('.')) {
    const octets = address.split('.')
    if (octets.length !== 4) return null
    return octets.reduce((accumulator, octet) => {
      const value = Number(octet)
      return (accumulator << 8n) | BigInt(value)
    }, 0n)
  }
  // Expansion du `::` : une seule occurrence, qui complète à huit groupes.
  const [head = '', tail = ''] = address.split('::')
  const left = head === '' ? [] : head.split(':')
  const right = tail === '' ? [] : tail.split(':')
  const missing = 8 - left.length - right.length
  if (missing < 0) return null
  const groups = [
    ...left,
    ...Array<string>(address.includes('::') ? missing : 0).fill('0'),
    ...right,
  ]
  if (groups.length !== 8) return null
  return groups.reduce(
    (accumulator, group) => (accumulator << 16n) | BigInt(`0x${group || '0'}`),
    0n,
  )
}

function inAnyRange(address: string, cidrs: string[]): boolean {
  const value = toBigInt(address)
  if (value === null) return false
  const isV4 = address.includes('.')
  return cidrs.some((cidr) => {
    const [network = '', prefixText = ''] = cidr.split('/')
    if (network.includes('.') !== isV4) return false
    const base = toBigInt(network)
    const prefix = Number(prefixText)
    if (base === null || Number.isNaN(prefix)) return false
    const width = isV4 ? 32n : 128n
    const shift = width - BigInt(prefix)
    return value >> shift === base >> shift
  })
}

const CLOUDFLARE = await cloudflareRanges()

/**
 * Depuis l'activation du proxy (2026-08-12), l'apex NE DOIT PLUS renvoyer l'IP
 * du VPS : c'est tout l'intérêt du montage. L'origine n'accepte d'ailleurs plus
 * que les plages Cloudflare. Une adresse hors de ces plages signifie soit que le
 * proxy a été désactivé, soit que l'origine est de nouveau exposée — et dans les
 * deux cas le site devient injoignable ou contournable.
 */
const servedByCloudflare = (values: string[]) => {
  if (values.length === 0) return { ok: false, detail: 'absent' }
  const outside = values.filter((address) => !inAnyRange(address, CLOUDFLARE))
  return {
    ok: outside.length === 0,
    detail:
      outside.length === 0
        ? `${values.join(', ')} — plages Cloudflare`
        : `${outside.join(', ')} HORS plages Cloudflare — proxy désactivé ou origine exposée`,
  }
}

const checks: Check[] = [
  {
    label: 'A — apex servi par Cloudflare, jamais l’IP d’origine',
    name: DOMAIN,
    type: 'A',
    verdict: servedByCloudflare,
  },
  {
    label: 'A — www servi par Cloudflare',
    name: `www.${DOMAIN}`,
    type: 'A',
    verdict: servedByCloudflare,
  },
  {
    // Cloudflare synthétise toujours l'IPv6 sur un nom proxifié, que l'origine
    // en serve ou non. Son absence signalerait donc que le proxy est inactif.
    label: 'AAAA — synthétisée par Cloudflare sur un nom proxifié',
    name: DOMAIN,
    type: 'AAAA',
    verdict: servedByCloudflare,
  },
  {
    label: 'SPF — exactement UNE ligne v=spf1',
    name: DOMAIN,
    type: 'TXT',
    verdict: (v) => {
      const spf = v.filter((t) => t.startsWith('v=spf1'))
      if (spf.length === 0) return { ok: false, detail: 'aucun enregistrement SPF' }
      if (spf.length > 1)
        return { ok: false, detail: `${spf.length} enregistrements — SPF INVALIDE, fusionner` }
      const record = spf[0]!
      return {
        ok: record.includes('spf.mailjet.com'),
        detail: record.includes('spf.mailjet.com')
          ? record
          : `${record} — il manque include:spf.mailjet.com`,
      }
    },
  },
  {
    label: 'DKIM — clé publiée par Mailjet',
    name: `mailjet._domainkey.${DOMAIN}`,
    type: 'TXT',
    verdict: (v) => {
      const key = v.join('')
      return { ok: key.includes('p='), detail: key ? `${key.slice(0, 48)}…` : 'absent' }
    },
  },
  {
    label: 'DMARC — publié en observation',
    name: `_dmarc.${DOMAIN}`,
    type: 'TXT',
    verdict: (v) => {
      const record = v.find((t) => t.startsWith('v=DMARC1'))
      if (record === undefined) return { ok: false, detail: 'absent' }
      const rua = /rua=mailto:([^;\s]+)/.exec(record)?.[1]
      if (rua === undefined) return { ok: false, detail: `${record} — pas d’adresse de rapport` }
      // Une adresse de rapport hors du domaine exige une autorisation publiée
      // dans la zone du destinataire — impossible sur gmail.com.
      const external = !rua.endsWith(`@${DOMAIN}`)
      return {
        ok: !external,
        detail: external ? `${record} — rua hors domaine, aucun rapport ne sera reçu` : record,
      }
    },
  },
  {
    label: 'MX — nécessaire pour que rua= soit joignable',
    name: DOMAIN,
    type: 'MX',
    verdict: (v) => ({ ok: v.length > 0, detail: v.join(', ') || 'aucun' }),
  },
]

let failures = 0
console.log(`Zone de ${DOMAIN}\n`)

for (const check of checks) {
  const perResolver = await Promise.all(
    RESOLVERS.map(async (r) => ({
      resolver: r.name,
      values: await resolve(r, check.name, check.type),
    })),
  )
  // Le verdict est calculé pour CHAQUE résolveur, pas seulement le premier.
  // Juger sur un seul produit un faux négatif au moment précis où l'on vérifie :
  // un enregistrement fraîchement créé est déjà visible chez l'opérateur
  // autoritaire alors qu'un autre garde encore une réponse négative en cache.
  // Constaté en publiant DMARC (P1-17).
  const verdicts = perResolver.map((r) => ({ ...r, ...check.verdict(r.values) }))
  const ok = verdicts.every((v) => v.ok)

  // L'accord se juge sur les ENSEMBLES de valeurs, pas sur le texte affiché :
  // les résolveurs renvoient les mêmes MX dans un ordre différent, et un TXT de
  // plus de 255 caractères — la clé DKIM — est découpé en segments que chacun
  // restitue à sa façon. Comparer les chaînes brutes signalerait une
  // désynchronisation qui n'existe pas.
  const normalize = (values: string[]) =>
    [...values]
      .map((value) => value.replace(/["\s]/g, ''))
      .sort()
      .join('|')
  const agree = verdicts.every((v) => normalize(v.values) === normalize(verdicts[0]!.values))

  console.log(`${ok ? '✓' : verdicts.some((v) => v.ok) ? '⏳' : '✗'} ${check.label}`)
  if (agree) {
    console.log(`    ${verdicts[0]!.detail}`)
  } else {
    for (const v of verdicts) console.log(`    ${v.ok ? '✓' : '✗'} ${v.resolver} : ${v.detail}`)
    console.log(`    ⏳ propagation en cours — pas encore effectif pour tous les destinataires`)
  }
  if (!ok) failures += 1
}

console.log(`\nNon vérifiable ici, à contrôler dans les tableaux de bord :`)
console.log(
  `  - renouvellement automatique du domaine (registraire) — vérifié au whois le 2026-08-11`,
)
console.log(`  - expéditeur validé et domaine authentifié (Mailjet) — Active le 2026-08-12`)

if (failures > 0) {
  console.error(`\n✗ ${failures} point(s) en échec — P1-17 n'est pas terminée.`)
  process.exit(1)
}
console.log(`\n✓ Tous les enregistrements vérifiables sont conformes.`)
