/**
 * Toute enveloppe racine déclare la langue du document (P4-07).
 *
 * **C'est l'invariant central de la tâche**, et il n'était vérifié qu'à moitié.
 * `<html lang>` absent est une violation WCAG 3.1.1, et c'est exactement le
 * défaut que P4-07 supprime : la 404 interne de Next est servie hors du layout
 * racine, donc sans langue déclarée.
 *
 * Le site a **deux** émetteurs de `<html>` : `app/[locale]/layout.tsx`, couvert
 * par les parcours E2E qui lisent l'attribut sur la page servie, et
 * `app/global-error.tsx`, qui rend sa propre enveloppe parce que Next l'y oblige
 * — et que rien ne vérifiait. Il est exclu de la couverture (composition), aucun
 * parcours ne peut l'atteindre (`phase-4-log.md` §13.6), et son test de composant
 * ne voit jamais de `<html>`. Relevé en revue.
 *
 * ⚠️ **Ce garde lit le texte source, et c'est un choix assumé.** Le dépôt a déjà
 * payé cette forme une fois (§7.1 : un garde par expression régulière qui
 * rougissait sur un reflow). La différence est que la propriété gardée **est**
 * syntaxique — un attribut sur une balise — et que l'alternative serait de
 * simuler `usePathname`, donc d'introduire le mock comme pratique du dépôt pour
 * une seule ligne.
 *
 * ⛔ **Et il a payé le même piège à sa première exécution** : la première version
 * comptait quatre enveloppes au lieu de deux, parce qu'elle lisait les `<html>`
 * **cités dans les commentaires** — ceux-là mêmes qui expliquent pourquoi
 * l'enveloppe existe. Les commentaires sont donc retirés avant lecture. La leçon
 * du dépôt tient : un garde qui lit du texte source lit *tout* le texte source.
 *
 * Sa limite restante est nommée plutôt que cachée : il ne verrait pas un
 * `<html {...props}>`. Aucun fichier n'écrit cela, et le compte ci-dessous est
 * ce qui signalerait une troisième enveloppe, quelle que soit sa forme.
 */
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const APP_DIR = join(process.cwd(), 'src', 'app')

async function rootEnvelopes(): Promise<{ file: string; tag: string }[]> {
  const entries = await readdir(APP_DIR, { recursive: true, withFileTypes: true })
  const found: { file: string; tag: string }[] = []

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.tsx')) continue

    const path = join(entry.parentPath, entry.name)
    // Les commentaires d'abord : ils parlent abondamment de `<html>`, et les
    // lire ferait compter quatre enveloppes pour deux.
    const code = (await readFile(path, 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '')

    for (const [tag] of code.matchAll(/<html\b[^>]*>/g)) {
      found.push({ file: path.slice(APP_DIR.length + 1), tag })
    }
  }

  return found
}

describe('enveloppes racines', () => {
  it('sont exactement trois — le layout de locale, et les deux frontières globales', async () => {
    /*
     * Le compte est l'autre moitié du garde : une enveloppe de plus est une
     * décision structurelle, pas un détail, et elle doit passer par ici.
     *
     * ⭐ La troisième est arrivée en **P4-10** : `global-not-found.tsx`, le
     * plancher sous le mécanisme de 404. Next ne l'entoure d'aucun layout — même
     * contrepartie que `global-error.tsx` —, elle rend donc sa propre enveloppe.
     * C'est précisément pour cela qu'elle existe : sans elle, les voies que le
     * proxy n'atteint pas recevaient un `<html>` **sans `lang`**, mesuré.
     */
    const files = (await rootEnvelopes()).map(({ file }) => file).sort()

    expect(files).toEqual(['[locale]/layout.tsx', 'global-error.tsx', 'global-not-found.tsx'])
  })

  it('déclarent toutes la langue du document', async () => {
    const silent = (await rootEnvelopes()).filter(({ tag }) => !tag.includes('lang='))

    expect(silent, 'un document sans « lang » est une violation WCAG 3.1.1').toEqual([])
  })
})
