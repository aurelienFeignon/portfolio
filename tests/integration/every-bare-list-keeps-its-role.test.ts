/**
 * Toute liste dépouillée garde sa sémantique (P4-11).
 *
 * ⚠️⚠️ **`list-style: none` retire la sémantique de liste à VoiceOver sous
 * Safari** — le lecteur d'écran cesse d'annoncer « liste de 5 éléments ». Ce
 * n'est pas un détail de style : c'est la structure qui disparaît. Le correctif
 * est `role="list"`, redondant en HTML et nécessaire en pratique.
 * `bare-list.module.css` porte cette raison, une fois.
 *
 * ⛔⛔ **Elle reposait pourtant sur la seule discipline, et P4-11 l'a cassée.**
 * Le sélecteur de langue a reçu un module qui compose `bareList` **sans**
 * l'attribut : six consommateurs sur sept le portaient, le septième ne le
 * portait pas, et rien ne le disait. La régression touchait les 16 pages
 * servies — et le moteur même que le profil mobile de cette tâche venait
 * couvrir. Relevée en revue.
 *
 * ⭐ Le garde confronte donc les deux : **tout module qui compose `bareList`**,
 * et **tout composant qui emploie sa classe**. Un consommateur qui oublie
 * l'attribut est nommé, avec son fichier.
 *
 * ⚠️ Il lit du texte source, comme le garde des enveloppes racines, et pour la
 * même raison : la propriété gardée **est** syntaxique — un attribut sur une
 * balise. Les commentaires sont retirés avant lecture, sans quoi il compterait
 * les `role="list"` que ces fichiers citent pour l'expliquer — le piège que
 * P4-07 a payé.
 */
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const UI_DIR = join(process.cwd(), 'src', 'ui')

/** Le texte d'un fichier, commentaires retirés. */
async function codeOf(path: string): Promise<string> {
  return (await readFile(path, 'utf8'))
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
}

async function filesUnder(directory: string, suffix: string): Promise<string[]> {
  const entries = await readdir(directory, { recursive: true, withFileTypes: true })

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(suffix))
    .map((entry) => join(entry.parentPath, entry.name))
}

describe('listes dépouillées', () => {
  it('trouve les modules qui composent `bareList`, sinon ce test ne vérifie rien', async () => {
    // Un parcours qui ne trouve rien rend l'assertion suivante verte pour la
    // pire des raisons (`phase-2-log.md` §10.5).
    const composing = await composingModules()

    expect(composing.length).toBeGreaterThanOrEqual(5)
  })

  it('chaque `<ul>` qui porte une de ces classes déclare `role="list"`', async () => {
    const classes = await composingModules()
    const faults: string[] = []

    for (const path of await filesUnder(UI_DIR, '.tsx')) {
      const code = await codeOf(path)

      for (const [tag] of code.matchAll(/<ul\b[^>]*>/g)) {
        const styled = classes.some((name) => tag.includes(`styles.${name}`))
        if (styled && !tag.includes('role="list"')) {
          faults.push(`${path.slice(UI_DIR.length + 1)} — ${tag}`)
        }
      }
    }

    expect(faults, '`list-style: none` sans `role="list"` : voir bare-list.module.css').toEqual([])
  })
})

/** Les classes, dans `src/ui`, qui composent `bareList`. */
async function composingModules(): Promise<string[]> {
  const found: string[] = []

  for (const path of await filesUnder(UI_DIR, '.module.css')) {
    const css = (await readFile(path, 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '')

    for (const [, name] of css.matchAll(
      /\.([\w-]+)\s*\{[^}]*composes:\s*bareList\s+from[^}]*\}/g,
    )) {
      if (name !== undefined) found.push(name)
    }
  }

  return found
}
