/**
 * Ce que Next sert depuis `public/`, à la racine du site (P4-07).
 *
 * **Écrit une fois, pour deux lecteurs qui doivent être d'accord.** Le
 * générateur du manifeste de routes en a besoin pour que le proxy laisse passer
 * ces fichiers ; `tests/integration/public-assets-reach-the-visitor.test.ts` en a
 * besoin pour confronter le disque au manifeste **committé**, c'est-à-dire pour
 * détecter qu'il est périmé.
 *
 * ⛔ Les deux parcours ont d'abord été écrits séparément, et ils n'étaient pas
 * équivalents : l'un partait d'une `URL` et lisait `.pathname`, qui est
 * **percent-encodé**. Un fichier nommé `cv fr.pdf` aurait produit
 * `/resume/cv%20fr.pdf` dans le manifeste et `/resume/cv fr.pdf` dans le test —
 * le test aurait réclamé une régénération que la régénération n'aurait pas
 * réparée, et le proxy aurait réécrit le fichier réel en 404. Relevé en revue.
 * `fileURLToPath` est la conversion correcte, et il n'y a plus qu'un parcours.
 */
import { readdir } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

export const PUBLIC_DIR = fileURLToPath(new URL('../public/', import.meta.url))

/**
 * Les chemins d'URL, triés — `['/README.md', '/resume/cv-en.pdf', …]`.
 *
 * La racine est un **argument**, comme celle des deux gates : c'est ce qui rend
 * le contrôle exécutable contre une arborescence fabriquée, donc testable.
 */
export async function publicUrlPaths(root: string = PUBLIC_DIR): Promise<readonly string[]> {
  const entries = await readdir(root, { recursive: true, withFileTypes: true })

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => `/${relative(root, join(entry.parentPath, entry.name)).split(sep).join('/')}`)
    .sort()
}
