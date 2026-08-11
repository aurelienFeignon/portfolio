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

const checks: Check[] = [
  {
    label: 'A — apex vers le VPS',
    name: DOMAIN,
    type: 'A',
    verdict: (v) => ({ ok: v.length === 1, detail: v.join(', ') || 'absent' }),
  },
  {
    label: 'AAAA — absent si le VPS n’a pas d’IPv6',
    name: DOMAIN,
    type: 'AAAA',
    verdict: (v) => ({
      ok: true,
      detail: v.length === 0 ? 'aucun (correct si pas d’IPv6 servie)' : v.join(', '),
    }),
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
  const values = perResolver[0]!.values
  const { ok, detail } = check.verdict(values)
  // Un TXT de plus de 255 caractères — la clé DKIM — est découpé en segments, et
  // chaque résolveur les restitue à sa façon. Comparer les chaînes brutes
  // signalerait une désynchronisation qui n'existe pas : on normalise d'abord.
  const normalize = (values: string[]) =>
    [...values]
      .map((value) => value.replace(/["\s]/g, ''))
      .sort()
      .join('|')
  const consistent = perResolver.every((r) => normalize(r.values) === normalize(values))

  console.log(`${ok ? '✓' : '✗'} ${check.label}`)
  console.log(`    ${detail}`)
  if (!consistent)
    console.log(`    ⚠ réponses différentes selon le résolveur — propagation en cours`)
  if (!ok) failures += 1
}

console.log(`\nNon vérifiable ici, à contrôler dans les tableaux de bord :`)
console.log(`  - renouvellement automatique du domaine (registraire)`)
console.log(`  - expéditeur validé et domaine authentifié (Mailjet)`)

if (failures > 0) {
  console.error(`\n✗ ${failures} point(s) en échec — P1-17 n'est pas terminée.`)
  process.exit(1)
}
console.log(`\n✓ Tous les enregistrements vérifiables sont conformes.`)
