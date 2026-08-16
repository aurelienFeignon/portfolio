/**
 * Chaque scénario E2E exigé par la stratégie de tests a un statut (P4-12).
 *
 * **Pourquoi ce garde existe.** `testing-strategy.md` §4.7 énumère quatorze
 * scénarios « minimaux exigés ». Rien ne reliait cette liste au banc : savoir
 * lequel était écrit, lequel attendait sa phase et lequel avait été oublié
 * supposait de relire les quatorze parcours et de s'en souvenir. C'est-à-dire un
 * inventaire de mémoire — et un inventaire de mémoire vieillit plus vite qu'un
 * nombre.
 *
 * ⛔⛔ **Le cas n'est pas théorique : la mission de P4-12 annonçait E2E-01 à
 * E2E-03, E2E-08 et E2E-12 « couverts par les parcours de P4-07 à P4-11 ».** Trois
 * ne l'étaient pas — la bascule de langue sur une **fiche**, la moitié clavier de
 * E2E-08, et le parcours continu de E2E-01. Une affirmation sur le banc que rien
 * ne confrontait au banc, dans le document qui demande de ne plus en écrire.
 *
 * **Les trois sens que ce garde tient.**
 *
 * | Sens | Ce qu'il attrape |
 * |---|---|
 * | document → table | un quinzième scénario ajouté à §4.7 sans statut |
 * | table → document | un statut qui nomme un scénario retiré du document |
 * | table → disque | un scénario déclaré couvert qu'aucun parcours ne revendique, **et** un scénario déclaré reporté qu'un parcours revendique déjà |
 *
 * ⚠️ **Ce qu'il ne prouve pas, et qu'il ne faut pas lui faire dire.** `@covers`
 * est une **déclaration** : ce garde vérifie qu'elle existe et qu'elle est
 * cohérente avec la table, jamais que le parcours mesure réellement ce que le
 * scénario décrit. Aucun test ne peut lire cette intention. Ce qu'il ferme est
 * l'oubli silencieux — un scénario que personne n'a écrit et que personne ne sait
 * manquant —, ce qui est exactement le défaut que P4-12 a trouvé.
 *
 * ⚠️ **L'extraction est bornée au bloc de code de §4.7**, et pas au document
 * entier : « E2E-01 » apparaît aussi en prose, ici comme ailleurs. Un garde qui
 * lit du texte source lit *tout* le texte source — la leçon de P4-07, appliquée
 * à celui-ci avant qu'il ne la paie.
 */
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/** Le statut d'un scénario : écrit, ou attendu par une tâche nommée. */
type Status = { readonly covered: true } | { readonly deferredTo: string; readonly why: string }

/**
 * Le statut de chacun des quatorze scénarios.
 *
 * ⭐ Aucun **chemin de fichier** ici, et c'est délibéré : la localisation d'un
 * parcours vit dans le parcours, sous la forme d'une annotation `@covers`. La
 * nommer une seconde fois dans cette table en ferait deux écritures à accorder —
 * exactement ce que la Phase 4 passe son temps à supprimer.
 */
const STATUS: Record<string, Status> = {
  'E2E-01': { covered: true },
  'E2E-02': { covered: true },
  'E2E-03': { covered: true },
  'E2E-04': { deferredTo: 'P10-10', why: 'le formulaire de CV n’existe pas avant la Phase 10' },
  'E2E-05': { deferredTo: 'P10-10', why: 'le formulaire de CV n’existe pas avant la Phase 10' },
  'E2E-06': { deferredTo: 'P10-10', why: 'le formulaire de CV n’existe pas avant la Phase 10' },
  'E2E-07': { deferredTo: 'P10-10', why: 'le formulaire de CV n’existe pas avant la Phase 10' },
  'E2E-08': { covered: true },
  'E2E-09': { covered: true },
  'E2E-10': { covered: true },
  'E2E-11': { covered: true },
  'E2E-12': { covered: true },
  // ⚠️ La moitié « back/forward » est exercée par le retour de E2E-01, qui revient
  // par le bouton du navigateur. Ce qui manque est l'autre moitié du scénario —
  // « et état de scène restauré » —, qui suppose `data-scene-focus` (P6-07). Le
  // déclarer couvert aujourd'hui affirmerait la partie qui n'existe pas.
  'E2E-13': { deferredTo: 'P6-10', why: 'l’état de scène n’existe pas avant la Phase 6' },
  'E2E-14': { deferredTo: 'P6-10', why: 'il n’y a aucune animation de caméra à supprimer' },
}

const SCENARIO_PATTERN = /^(E2E-\d{2})\s{2,}(.+)$/

/**
 * Les scénarios tels que §4.7 les énumère, lus dans son **bloc de code**.
 *
 * La borne n'est pas de la prudence : le même document cite des identifiants en
 * prose, et ce fichier en cite quatorze. Sans elle, l'extraction rendrait des
 * scénarios que la stratégie n'exige pas.
 */
async function requiredScenarios(): Promise<Map<string, string>> {
  const document = await readFile(join(process.cwd(), 'docs', 'testing-strategy.md'), 'utf8')

  const heading = document.indexOf('Scénarios minimaux exigés')
  expect(heading, 'la section des scénarios a disparu de testing-strategy.md').toBeGreaterThan(-1)

  const opening = document.indexOf('```', heading)
  const closing = document.indexOf('```', opening + 3)
  expect(closing, 'le bloc des scénarios n’est pas fermé').toBeGreaterThan(opening)

  const block = document.slice(document.indexOf('\n', opening) + 1, closing)

  return new Map(
    block
      .split('\n')
      .map((line) => SCENARIO_PATTERN.exec(line.trim()))
      .filter((match) => match !== null)
      .map((match) => [match[1] as string, (match[2] as string).trim()]),
  )
}

/** Les scénarios que le banc revendique, par leur annotation `@covers`. */
async function declaredByTheSuite(): Promise<Map<string, string[]>> {
  const root = join(process.cwd(), 'tests', 'e2e')
  const entries = await readdir(root, { recursive: true, withFileTypes: true })
  const specs = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.spec.ts'))

  expect(specs.length, 'aucun fichier de parcours trouvé').toBeGreaterThan(0)

  const claims = new Map<string, string[]>()
  for (const spec of specs) {
    const path = join(spec.parentPath, spec.name)
    const source = await readFile(path, 'utf8')

    for (const match of source.matchAll(/@covers\s+(E2E-\d{2})\b/g)) {
      const id = match[1] as string
      claims.set(id, [...(claims.get(id) ?? []), path.slice(root.length + 1)])
    }
  }

  return claims
}

describe('inventaire des scénarios E2E', () => {
  it('donne un statut à chaque scénario exigé, et n’en invente aucun', async () => {
    const required = await requiredScenarios()

    // Sans ce plancher, une extraction qui ne trouve **rien** rendrait ce test
    // vert le jour où la table serait vidée en même temps. C'est la panne que
    // `support/sitemap.ts` documente : un extracteur fautif ne fait pas échouer
    // un test, il le rend vert sans avoir rien inspecté.
    expect(required.size, 'aucun scénario extrait de §4.7').toBeGreaterThanOrEqual(14)

    expect([...required.keys()].sort()).toEqual(Object.keys(STATUS).sort())
  })

  it('adosse chaque scénario couvert à un parcours qui le revendique', async () => {
    const declared = await declaredByTheSuite()

    const unclaimed = Object.entries(STATUS)
      .filter(([, status]) => 'covered' in status)
      .map(([id]) => id)
      .filter((id) => !declared.has(id))

    expect(unclaimed, 'déclarés couverts, revendiqués par aucun parcours').toEqual([])
  })

  it('n’accepte pas qu’un scénario reporté soit déjà revendiqué', async () => {
    // Le sens que la table seule ne tient pas. Un parcours écrit pour un scénario
    // resté « reporté » laisserait l'inventaire annoncer un manque comblé : le
    // report survivrait au travail qui le lève, et c'est la prose qui survit au
    // code, retournée contre son propre outillage.
    const declared = await declaredByTheSuite()

    const stale = Object.entries(STATUS)
      .filter(([, status]) => 'deferredTo' in status)
      .map(([id]) => id)
      .filter((id) => declared.has(id))

    expect(stale, 'reportés, et pourtant revendiqués par un parcours').toEqual([])
  })

  it('ne reporte que vers des tâches qui existent', async () => {
    // Un report vers une tâche inventée est un pointeur mort : il a l'air d'un
    // plan et n'en est pas un. `roadmap.md` est la source de vérité des
    // identifiants, et ils ne sont jamais réutilisés.
    //
    // ⚠️ Ce contrôle prouve que l'identifiant **existe**, pas que la tâche porte
    // ce scénario. Le second est un jugement, et il vit dans `why`.
    const roadmap = await readFile(join(process.cwd(), 'docs', 'roadmap.md'), 'utf8')

    const tasks = [
      ...new Set(
        Object.values(STATUS)
          .filter((status) => 'deferredTo' in status)
          .map((status) => (status as { deferredTo: string }).deferredTo),
      ),
    ]

    expect(tasks.length, 'aucun report à vérifier').toBeGreaterThan(0)

    const unknown = tasks.filter((task) => !new RegExp(`\\|\\s*${task}\\s*\\|`).test(roadmap))

    expect(unknown, 'reports vers des tâches absentes de la roadmap').toEqual([])
  })
})
