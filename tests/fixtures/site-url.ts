/**
 * Fige `SITE_URL` pour la durée d'une suite, et la restaure ensuite.
 *
 * **Pourquoi ce fichier existe.** Les dix mêmes lignes — sauvegarde de la valeur
 * précédente, `beforeAll`, `afterAll` qui distingue « absente » de « autre
 * valeur » — étaient recopiées dans `tests/unit/app/page-metadata.test.ts` et
 * `tests/unit/seo/metadata.test.ts`, et P4-09 en écrivait une **troisième**
 * copie. C'est le seuil auquel ce dépôt extrait (`phase-4-log.md` §7.5, où la
 * quatrième copie d'un extracteur de sitemap a décidé du déplacement).
 *
 * ⚠️ Ce n'est pas de la commodité : la restauration est du **code de garde**. Une
 * copie qui oublierait le `delete` laisserait fuir `SITE_URL` dans les suites
 * voisines, et le symptôme apparaîtrait dans un autre fichier que celui qui a
 * fauté — la panne la plus chère à diagnostiquer.
 *
 * Les tests l'appellent au niveau du fichier ; les crochets s'enregistrent au
 * moment de la collecte, comme s'ils y étaient écrits.
 */
import { afterAll, beforeAll } from 'vitest'

export function freezeSiteUrl(origin: string): void {
  const previous = process.env['SITE_URL']

  beforeAll(() => {
    process.env['SITE_URL'] = origin
  })

  afterAll(() => {
    // `undefined` et chaîne vide ne sont pas la même chose pour `parseSiteUrl` :
    // restaurer une chaîne vide ferait échouer les suites voisines avec un
    // message qui accuse leur propre code.
    if (previous === undefined) delete process.env['SITE_URL']
    else process.env['SITE_URL'] = previous
  })
}
