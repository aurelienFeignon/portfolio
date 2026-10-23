/**
 * Mesure de référence de la performance : la même image, avec et sans scène,
 * en plusieurs tirs — `performance-budget.md` §6.3.
 *
 * ⛔⛔ **Pourquoi ce script existe.** La dette de TBT de la Phase 5 (640 → 2 090
 * ms, §6.2) reposait sur **une seule valeur par métrique**, lue à la main dans
 * des rapports jamais archivés, sans savoir quel palier la scène avait monté —
 * et `check-lighthouse.mts` ne sort aucun temps, seulement des scores. Aucune
 * commande ne pouvait reproduire le chiffre sur lequel la Phase 11 et NEXUS
 * doivent se juger.
 *
 * Ce qu'il fait, et pourquoi chaque point :
 *
 * 1. **N tirs (5 par défaut), médiane et étendue.** Le TBT de Lantern varie d'un
 *    tir à l'autre sans qu'une ligne ait bougé ; une valeur seule ne dit pas si
 *    un écart est un effet ou du bruit.
 * 2. **Un témoin sans scène, sur la même image**, par un Chromium lancé sans
 *    API 3D. L'écart entre les deux est le coût de la scène, et lui seul : le
 *    reste — hydratation, CSS, contenu — s'annule.
 * 3. **Le palier est LU dans la page, jamais supposé** (`tier-mark.ts`). Un
 *    témoin qui ne rapporte pas `none`, ou une mesure « avec scène » qui ne
 *    rapporte pas un palier monté, **arrêtent** le script : le dépôt sait déjà
 *    qu'un drapeau de lancement peut laisser SwiftShader répondre
 *    (`playwright.config.ts`, profil `no-webgl`).
 * 4. **Les tirs sont entrelacés** — scène, témoin, scène, témoin — pour qu'une
 *    dérive de charge de la machine pèse sur les deux séries à parts égales.
 * 5. **Les conditions sont consignées** avec les chiffres : commit, image,
 *    versions, `benchmarkIndex` de Lighthouse et charge de l'hôte. Sans elles,
 *    une médiane ne se compare à rien.
 *
 * ⚠️ **Ce n'est pas un gate** : rien n'y bloque. La CI joue
 * `check-lighthouse.mts` ; celui-ci se lance à la main (`make perf-baseline`),
 * parce qu'il coûte quelques minutes (quatre pour 40 audits, mesuré le 2026-10-23).
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { cpus, loadavg } from 'node:os'
import { join } from 'node:path'

import { chromium } from '@playwright/test'
import lighthouse from 'lighthouse'

import { FORM_FACTORS, pagesToAudit } from './lighthouse-profiles.mts'

const BASE_URL = process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://web:3000'
const RUNS = Number(process.env['RUNS'] ?? 5)
const STARTED = new Date().toISOString()
const OUT_DIR =
  process.env['OUT_DIR'] ??
  join(
    '.perf',
    `${STARTED.replace(/[:.]/g, '-')}-${process.env['GIT_SHA']?.slice(0, 7) ?? 'inconnu'}`,
  )

if (!Number.isInteger(RUNS) || RUNS < 1) throw new Error(`RUNS invalide : ${process.env['RUNS']}`)

/**
 * Les deux modes, chacun dans son propre navigateur : un drapeau de lancement
 * vaut pour toute l'instance.
 *
 * ⭐ Le témoin coupe WebGL par **trois** drapeaux, mais c'est le palier rapporté
 * qui fait foi, pas leur présence (point 3 ci-dessus).
 */
const MODES = [
  { name: 'scène', port: 9222, args: [], expectsScene: true },
  {
    name: 'témoin',
    port: 9223,
    args: ['--disable-3d-apis', '--disable-webgl', '--disable-webgl2'],
    expectsScene: false,
  },
] as const

/** Les métriques relevées : l'identifiant d'audit Lighthouse, et son unité. */
const METRICS = [
  { id: 'total-blocking-time', label: 'TBT', unit: 'ms' },
  { id: 'largest-contentful-paint', label: 'LCP', unit: 'ms' },
  { id: 'cumulative-layout-shift', label: 'CLS', unit: '' },
  { id: 'first-contentful-paint', label: 'FCP', unit: 'ms' },
  { id: 'speed-index', label: 'SI', unit: 'ms' },
  { id: 'mainthread-work-breakdown', label: 'thread principal', unit: 'ms' },
  { id: 'bootup-time', label: 'exécution JS', unit: 'ms' },
] as const

type Run = {
  page: string
  factor: string
  mode: string
  run: number
  tier: string | null
  /** L'instant où le palier a été décidé, depuis le début de la navigation. */
  tierAtMs: number | null
  score: number
  metrics: Record<string, number>
  benchmarkIndex: number
}

type UserTiming = { name: string; startTime?: number }

/**
 * Le palier que les repères d'une page annoncent, `null` s'il n'y en a aucun.
 *
 * ⚠️ **Relu ici, et non importé** de `src/scene/capability/tier-mark.ts` :
 * `scripts/` n'a pas le droit d'importer `scene` (`eslint.config.mjs`). Un nom
 * qui changerait là-bas ferait rendre `null` ici — donc arrêter la mesure, pas
 * la fausser.
 */
const TIER_MARK = /^scene:tier:(full|reduced|lite|none)$/

function tierFromTimings(timings: readonly UserTiming[]): (UserTiming & { tier: string }) | null {
  const found = timings.flatMap((timing) => {
    const tier = TIER_MARK.exec(timing.name)?.[1]
    return tier === undefined ? [] : [{ ...timing, tier }]
  })
  // ⛔ Deux paliers dans la même page sont une erreur, pas un choix : le montage
  // décide une fois. Garder l'un des deux attribuerait la mesure au hasard.
  if (new Set(found.map((timing) => timing.tier)).size > 1) {
    throw new Error(`Paliers contradictoires : ${found.map((timing) => timing.name).join(', ')}`)
  }
  return found[0] ?? null
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1
    ? (sorted[middle] as number)
    : ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2
}

const browsers = await Promise.all(
  MODES.map((mode) =>
    chromium.launch({ args: [`--remote-debugging-port=${mode.port}`, ...mode.args] }),
  ),
)

const runs: Run[] = []
const loadBefore = loadavg()
let lighthouseVersion = ''
let userAgent = ''

mkdirSync(join(OUT_DIR, 'lhr'), { recursive: true })

try {
  const pages = await pagesToAudit(BASE_URL)
  const total = RUNS * pages.length * FORM_FACTORS.length * MODES.length
  let done = 0

  for (let run = 1; run <= RUNS; run += 1) {
    for (const path of pages) {
      for (const factor of FORM_FACTORS) {
        for (const mode of MODES) {
          const result = await lighthouse(
            `${BASE_URL}${path}`,
            { port: mode.port, output: 'json', logLevel: 'error' },
            {
              extends: 'lighthouse:default',
              settings: { ...factor.settings, onlyCategories: ['performance'] },
            },
          )
          if (result === undefined) throw new Error(`Lighthouse n'a rien rendu pour ${path}`)
          const { lhr } = result

          const timings = ((lhr.audits['user-timings']?.details as { items?: UserTiming[] })
            ?.items ?? []) as UserTiming[]
          const decided = tierFromTimings(timings)
          const tier = decided?.tier ?? null
          const where = `${path} (${factor.name}, ${mode.name}, tir ${run})`

          /*
           * ⛔⛔ Le point 3 : un tir dont le palier ne correspond pas au mode
           * n'est pas une mesure de ce mode. On s'arrête au lieu de le moyenner.
           */
          if (tier === null) {
            throw new Error(
              `Aucun palier décidé pendant la mesure de ${where} : le montage n'a pas eu lieu.`,
            )
          }
          if (mode.expectsScene && tier === 'none') {
            throw new Error(`La mesure « avec scène » a rapporté le palier none sur ${where}.`)
          }
          if (!mode.expectsScene && tier !== 'none') {
            throw new Error(
              `Le témoin a rapporté le palier ${tier} sur ${where} : WebGL n'est pas coupé.`,
            )
          }

          const score = lhr.categories['performance']?.score
          if (score === null || score === undefined) {
            throw new Error(`Lighthouse n'a pas su calculer « performance » sur ${where}`)
          }

          const metrics: Record<string, number> = {}
          for (const metric of METRICS) {
            const value = lhr.audits[metric.id]?.numericValue
            if (value === undefined) throw new Error(`Audit « ${metric.id} » absent sur ${where}`)
            metrics[metric.id] = value
          }

          lighthouseVersion = lhr.lighthouseVersion
          userAgent = lhr.environment.hostUserAgent
          runs.push({
            page: path,
            factor: factor.name,
            mode: mode.name,
            run,
            tier,
            tierAtMs: decided?.startTime ?? null,
            score: Math.round(score * 100),
            metrics,
            benchmarkIndex: lhr.environment.benchmarkIndex,
          })

          // Le rapport complet reste sur disque (`.perf/`, ignoré par git) : c'est
          // lui qu'on rouvre pour comprendre un écart, pas le résumé.
          const file = `${path.replaceAll('/', '_')}-${factor.name}-${mode.name}-${run}.json`
          writeFileSync(join(OUT_DIR, 'lhr', file), JSON.stringify(lhr))

          done += 1
          console.log(
            `  [${String(done).padStart(2)}/${total}] ${where} : palier ${tier}, ` +
              `TBT ${Math.round(metrics['total-blocking-time'] ?? NaN)} ms`,
          )
        }
      }
    }
  }
} finally {
  await Promise.all(browsers.map((browser) => browser.close()))
}

/*
 * ⭐ Un palier qui change d'un tir à l'autre dans la même configuration rend la
 * médiane ininterprétable : elle mélangerait deux scènes. On le signale.
 */
const groups = new Map<string, Run[]>()
for (const run of runs) {
  const key = `${run.page}|${run.factor}|${run.mode}`
  groups.set(key, [...(groups.get(key) ?? []), run])
}

const summary = [...groups.values()].map((group) => {
  const first = group[0] as Run
  const tiers = [...new Set(group.map((run) => run.tier))]
  return {
    page: first.page,
    factor: first.factor,
    mode: first.mode,
    tiers,
    runs: group.length,
    score: median(group.map((run) => run.score)),
    metrics: Object.fromEntries(
      METRICS.map((metric) => {
        const values = group.map((run) => run.metrics[metric.id] as number)
        return [
          metric.id,
          { median: median(values), min: Math.min(...values), max: Math.max(...values) },
        ]
      }),
    ),
  }
})

const conditions = {
  startedAt: STARTED,
  finishedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  gitSha: process.env['GIT_SHA'] ?? null,
  imageId: process.env['IMAGE_ID'] ?? null,
  runsPerConfiguration: RUNS,
  lighthouseVersion,
  userAgent,
  benchmarkIndex: median(runs.map((run) => run.benchmarkIndex)),
  hostCpus: cpus().length,
  hostLoadBefore: loadBefore,
  hostLoadAfter: loadavg(),
}

writeFileSync(
  join(OUT_DIR, 'summary.json'),
  `${JSON.stringify({ conditions, summary, runs }, null, 2)}\n`,
)

const fmt = (value: number, unit: string) =>
  unit === '' ? value.toFixed(3) : `${Math.round(value)}${unit === 'ms' ? ' ms' : ''}`

console.log(`\n  Mesure de référence — ${RUNS} tir(s) par configuration, médiane [min – max]\n`)
for (const line of summary) {
  console.log(
    `  ${line.page} · ${line.factor} · ${line.mode} — palier ${line.tiers.join('/')} · score ${line.score}`,
  )
  if (line.tiers.length > 1)
    console.log('    ⚠ palier instable d’un tir à l’autre : médiane à ne pas lire')
  for (const metric of METRICS) {
    const { median: med, min, max } = line.metrics[metric.id] as Record<string, number>
    console.log(
      `    ${metric.label.padEnd(17)} ${fmt(med as number, metric.unit).padStart(9)}` +
        `   [${fmt(min as number, metric.unit)} – ${fmt(max as number, metric.unit)}]`,
    )
  }
}

console.log('\n  Coût de la scène (médiane avec scène − médiane du témoin) :\n')
for (const line of summary.filter((entry) => entry.mode === 'scène')) {
  const witness = summary.find(
    (entry) => entry.mode === 'témoin' && entry.page === line.page && entry.factor === line.factor,
  )
  if (witness === undefined) continue
  const delta = (id: string) =>
    ((line.metrics[id] as Record<string, number>)['median'] as number) -
    ((witness.metrics[id] as Record<string, number>)['median'] as number)
  console.log(
    `    ${line.page} · ${line.factor} : TBT ${delta('total-blocking-time') >= 0 ? '+' : ''}` +
      `${Math.round(delta('total-blocking-time'))} ms, thread principal ` +
      `${delta('mainthread-work-breakdown') >= 0 ? '+' : ''}${Math.round(delta('mainthread-work-breakdown'))} ms`,
  )
}

console.log(
  `\n  Conditions : ${conditions.gitSha ?? 'commit inconnu'} · Lighthouse ${lighthouseVersion} · ` +
    `benchmarkIndex ${Math.round(conditions.benchmarkIndex)} · charge ${loadBefore
      .map((value) => value.toFixed(1))
      .join('/')} → ${conditions.hostLoadAfter.map((value) => value.toFixed(1)).join('/')} ` +
    `sur ${conditions.hostCpus} cœurs`,
)
console.log(`  Résumé et rapports complets : ${OUT_DIR}/\n`)
