/**
 * Audit Lighthouse de l'image de production, et application des seuils (P4-13).
 *
 * ⛔⛔ **Pourquoi ce script existe.** « Lighthouse mobile ≥ 85 / a11y 100 /
 * SEO 100 » est un **critère de sortie de la Phase 4** depuis la Phase 0, et il
 * n'était mesuré nulle part : le mot n'apparaissait que dans quatre documents.
 * C'est le défaut exact du seuil de 400 Mo, que P4-05 a découvert en s'y
 * référant — *un seuil que rien ne fait respecter n'est pas un seuil*. Relevé
 * pendant l'inventaire de P4-12.
 *
 * ## Ce qui bloque, et ce qui avertit seulement
 *
 * ⭐⭐ **Toutes les catégories ne se mesurent pas de la même façon, et les traiter
 * pareil produirait le pire signal possible : une CI rouge sur du code
 * conforme.** `accessibility` et `seo` sont des **contrôles structurels** —
 * l'attribut est là ou il n'y est pas — et leur score ne dépend ni de la charge
 * de la machine ni du réseau : ils bloquent, à 100, sans négociation
 * (`performance-budget.md` §3). `performance` est calculé à partir de temps
 * mesurés puis simulés par Lantern : sur un runner GitHub partagé à 2 vCPU, il
 * varie d'un tir à l'autre sans qu'une ligne de code ait bougé. Il est **relevé
 * et affiché**, jamais bloquant — et c'est écrit ici plutôt que découvert par une
 * CI rouge un vendredi soir.
 *
 * ⚠️ **Le relevé qui fera foi pour la performance est P4-16**, contre le site
 * réel, réseau et CDN compris — c'est-à-dire ce qu'un visiteur subit. Celui-ci
 * mesure l'artefact, pas le service : il ne dit rien du TTFB depuis une autre
 * région (`performance-budget.md` §2), et ne le prétend pas.
 *
 * ## Comment Chrome est obtenu
 *
 * ⭐ **Aucun `chrome-launcher`, aucune installation de navigateur** : ce script
 * tourne dans le service `e2e`, dont l'image Playwright porte déjà Chromium. On
 * le lance par Playwright avec un port de débogage, et Lighthouse s'y branche.
 * Une dépendance de moins, et le navigateur audité est exactement celui du banc.
 */
import { chromium } from '@playwright/test'
import lighthouse from 'lighthouse'

const BASE_URL = process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://web:3000'
const DEBUG_PORT = 9222

/**
 * `performance-budget.md` §3, et **trois manières de juger** — parce que les
 * quatre catégories ne se mesurent pas de la même façon.
 *
 * | `verdict` | Ce qui décide | Pourquoi |
 * |---|---|---|
 * | `score` | le score, à 100 | contrôles structurels : l'attribut est là ou il n'y est pas |
 * | `audits` | *aucun audit en échec* hors ceux du banc | le score est plafonné par le HTTP nu du conteneur, pas par le site |
 * | `relevé` | rien — la valeur est affichée | dépend de la charge de la machine ; le relevé qui fait foi est P4-16 |
 */
const THRESHOLDS = [
  { category: 'accessibility', label: 'accessibilité', minimum: 100, verdict: 'score' },
  { category: 'seo', label: 'SEO', minimum: 100, verdict: 'score' },
  // Pas de `minimum` : cette catégorie est jugée sur ses audits, et afficher
  // un seuil de 95 à côté d'un 78 accepté n'aurait fait qu'égarer le lecteur.
  { category: 'best-practices', label: 'bonnes pratiques', verdict: 'audits' },
  { category: 'performance', label: 'performance', minimum: 85, verdict: 'relevé' },
] as const

/**
 * Les deux audits que **le banc** ne peut pas satisfaire, et que le site tient.
 *
 * ⭐⭐ **Ils dépendent de l'adresse par laquelle on interroge l'image, et le
 * score de la catégorie avec.** `is-on-https` (poids 5) et `redirects-http`
 * (poids 1) échouent quand l'origine n'est pas un **contexte sûr** : c'est le cas
 * en local, où le service `e2e` joint `http://web:3000` par le réseau Docker, et
 * « bonnes pratiques » y plafonne à **78**. Ce n'est **pas** le cas en CI, où
 * l'image est servie sur `http://localhost:3000` — que Chrome tient pour sûr —
 * et où la même commande rend **100**.
 *
 * ⭐⭐⭐ Le chiffre écrit ici a d'abord été **78 tout court**, mesuré à un seul
 * endroit et énoncé comme s'il était universel. La première exécution en CI l'a
 * démenti le jour même. C'est pour cela que cette liste existe : elle rend le
 * verdict **identique des deux côtés**, au lieu de le faire dépendre de l'endroit
 * où l'on mesure.
 *
 * La production, elle, est en HTTPS avec HSTS et une redirection 308, **vérifiée
 * depuis l'extérieur** (`deploy/README.md` §2).
 *
 * ⛔ C'est pourquoi cette catégorie n'est pas jugée sur son **score** — ce serait
 * mesurer le banc — mais sur une propriété qui, elle, parle du site : *aucun
 * autre audit ne doit échouer*. Une API dépréciée, une erreur de console, une
 * bibliothèque vulnérable feraient donc rougir, alors qu'un seuil à 95 sur le
 * score serait resté rouge en permanence et aurait fini par être supprimé.
 */
const LAB_ONLY_FAILURES = new Set(['is-on-https', 'redirects-http'])

/**
 * Les deux pages que `performance-budget.md` §2 désigne comme profil de
 * référence : l'accueil et une page de détail.
 *
 * ⚠️ **La lecture du sitemap est refaite ici plutôt que partagée avec
 * `tests/e2e/support/sitemap.ts`, et c'est délibéré** : ce script vit dans
 * `scripts/`, l'autre dans `tests/`, et le second lit par l'`APIRequestContext`
 * de Playwright là où celui-ci n'a que `fetch`. Les mettre en commun demanderait
 * un troisième emplacement et une abstraction sur le client HTTP, pour six
 * lignes. Le déclencheur d'extraction est un **troisième** lecteur.
 *
 * ⚠️ **La fiche est déduite du sitemap**, jamais nommée : `content/` appartient à
 * l'auteur du site et change. C'est la règle que les parcours E2E appliquent
 * depuis P2-11, et la raison en est la même — un audit qui nomme une entité
 * mesure le contenu du jour.
 */
async function pagesToAudit(): Promise<string[]> {
  const xml = await (await fetch(`${BASE_URL}/sitemap.xml`)).text()
  const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (match) => new URL(match[1] as string).pathname,
  )

  if (paths.length === 0) throw new Error('sitemap vide : rien à auditer')

  const detail = paths.find((path) => path.startsWith('/fr/') && path.split('/').length === 4)
  if (detail === undefined) throw new Error('aucune page de détail au sitemap')

  return ['/fr', detail]
}

/** Le profil mobile de `performance-budget.md` §2, et le profil desktop. */
const FORM_FACTORS = [
  // Rien d'autre que le facteur de forme : le profil mobile de Lighthouse porte
  // déjà son émulation d'écran et son bridage. Passer `screenEmulation:
  // undefined` revenait à écrire explicitement ce que l'absence de clé dit mieux.
  { name: 'mobile', settings: { formFactor: 'mobile' as const } },
  {
    name: 'desktop',
    settings: {
      formFactor: 'desktop' as const,
      screenEmulation: {
        mobile: false,
        width: 1350,
        height: 940,
        deviceScaleFactor: 1,
        disabled: false,
      },
      throttling: { rttMs: 40, throughputKbps: 10_240, cpuSlowdownMultiplier: 1 },
    },
  },
]

const browser = await chromium.launch({ args: [`--remote-debugging-port=${DEBUG_PORT}`] })

type Reading = {
  page: string
  factor: string
  category: string
  score: number
  /** Audits en échec, hors ceux que le banc seul empêche. */
  failing: string[]
}
const readings: Reading[] = []

try {
  for (const path of await pagesToAudit()) {
    for (const factor of FORM_FACTORS) {
      const result = await lighthouse(
        `${BASE_URL}${path}`,
        { port: DEBUG_PORT, output: 'json', logLevel: 'error' },
        {
          extends: 'lighthouse:default',
          settings: { ...factor.settings, onlyCategories: THRESHOLDS.map((t) => t.category) },
        },
      )

      if (result === undefined) throw new Error(`Lighthouse n'a rien rendu pour ${path}`)

      for (const { category } of THRESHOLDS) {
        /*
         * ⛔ **Un audit que Lighthouse n'a pas pu exécuter n'est pas un audit
         * réussi.** La première rédaction filtrait sur `score !== null`, ce qui
         * écarte aussi bien les audits informatifs que ceux **tombés en
         * erreur** (`scoreDisplayMode: 'error'`). Comme « bonnes pratiques » est
         * jugée sur cette liste et jamais sur son score, un audit planté s'y
         * lisait comme un succès — un gate qui verdit sur une panne de son
         * propre instrument. Relevé en revue.
         */
        const failing = (result.lhr.categories[category]?.auditRefs ?? [])
          .filter((ref) => {
            const audit = result.lhr.audits[ref.id]
            if (audit === undefined) return false
            if (audit.scoreDisplayMode === 'error') return true
            return audit.score !== null && audit.score < 1
          })
          .map((ref) => ref.id)
          .filter((id) => !LAB_ONLY_FAILURES.has(id))

        const score = result.lhr.categories[category]?.score
        // ⚠️ Un score absent n'est pas un score de zéro : c'est une catégorie que
        // Lighthouse n'a pas pu calculer, et la confondre avec un échec ferait
        // rougir sur une panne d'outillage. On le dit.
        if (score === null || score === undefined) {
          throw new Error(`Lighthouse n'a pas su calculer « ${category} » sur ${path}`)
        }
        readings.push({
          page: path,
          factor: factor.name,
          category,
          score: Math.round(score * 100),
          failing,
        })
      }
    }
  }
} finally {
  await browser.close()
}

/**
 * ⛔⛔ **La cible se LIT, elle ne se raconte pas.** Ce script a imprimé « contre
 * l'image de production » et « ce banc sert du HTTP nu » pendant qu'il auditait
 * `https://aurelienfeignon.com` en HTTPS, avec `is-on-https` à 100 — les deux
 * phrases étaient constantes, la cible ne l'est pas. C'est le défaut que la
 * Phase 4 traque partout ailleurs, trouvé dans le rapport qui devait servir de
 * preuve à P4-16.
 */
const SUR_HTTPS = BASE_URL.startsWith('https:')
const CIBLE = SUR_HTTPS ? `le site réel (${BASE_URL})` : `l’image de production (${BASE_URL})`

console.log(`\n  Lighthouse, contre ${CIBLE} :\n`)

const failures: string[] = []

for (const threshold of THRESHOLDS) {
  const { category, label } = threshold

  for (const reading of readings.filter((entry) => entry.category === category)) {
    const where = `${reading.page} (${reading.factor})`

    /*
     * ⚠️ Le test porte sur `threshold.verdict` et non sur une variable
     * déstructurée : c'est ce qui fait discriminer l'union par le compilateur, et
     * donc ce qui rend `threshold.minimum` légitime là où il est lu. Déstructurer
     * `verdict` compilait ici par accident — les `.mts` de `scripts/` ne sont pas
     * dans le périmètre de `tsconfig.json`, une exposition antérieure à cette
     * tâche et signalée en revue.
     */
    const verdict =
      threshold.verdict === 'relevé'
        ? { blocking: false as const }
        : threshold.verdict === 'score'
          ? {
              blocking: true as const,
              held: reading.score >= threshold.minimum,
              why: `${label} : ${reading.score} sur ${where}, exigé ${threshold.minimum}`,
            }
          : {
              blocking: true as const,
              held: reading.failing.length === 0,
              why: `${label} : ${reading.failing.join(', ')} en échec sur ${where}`,
            }

    const mark = !verdict.blocking ? '·' : verdict.held ? '✓' : '✗'
    console.log(`    ${mark}  ${String(reading.score).padStart(3)}  ${label} — ${where}`)

    if (verdict.blocking && !verdict.held) failures.push(verdict.why)
  }
}

/*
 * ⚠️ **Deux phrases, parce que deux raisons différentes.** Les confondre était le
 * premier jet de ce script : il annonçait « le score dépend de la charge de la
 * machine » pour « bonnes pratiques », ce qui est **faux** — 78 y est parfaitement
 * déterministe, et vient du HTTP nu du banc. Une explication fausse est pire
 * qu'aucune : elle fait classer un chiffre parmi le bruit, et personne ne le
 * regarde plus.
 */
console.log(
  (SUR_HTTPS
    ? `\n  « bonnes pratiques » porte ici son score entier : ${[...LAB_ONLY_FAILURES].join(' et ')} ` +
      `passent sur une origine en HTTPS, ce que le banc local ne peut pas rendre.\n`
    : `\n  « bonnes pratiques » est jugée sur ses audits, pas sur son score : ` +
      `${[...LAB_ONLY_FAILURES].join(' et ')} échouent parce que ce banc sert du HTTP nu.\n`) +
    `  « performance » est relevée sans être bloquante : elle dépend de la charge de la machine.\n` +
    (SUR_HTTPS
      ? `  Ce relevé-ci est celui qui fait foi (P4-16) : il mesure le service, réseau et CDN compris.`
      : `  Le relevé qui fait foi pour les deux est P4-16, contre le site réel.`),
)

if (failures.length > 0) {
  console.error('\n  ✗ Ce qui n’est pas tenu :')
  for (const failure of failures) console.error(`      ${failure}`)
  /*
   * ⚠️ `process.exitCode`, jamais `process.exit()`. Quand la sortie standard est
   * un **tuyau** — ce qu'elle est en CI, où l'étape passe par `tee` —, Node
   * écrit de façon asynchrone : `process.exit()` abandonne ce qui reste en file
   * et tronque le message qui explique l'échec, voire le tableau entier. Le
   * processus se termine tout seul, avec ce code, une fois les écritures
   * vidées. Relevé en revue.
   */
  process.exitCode = 1
} else {
  console.log('\n  ✓ Accessibilité et SEO à 100, et aucun autre audit en échec.\n')
}
