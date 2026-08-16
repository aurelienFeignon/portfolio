/**
 * Rien de ce que sert `public/` ne doit traverser le proxy (P4-07).
 *
 * **La panne que ce test ferme.** Depuis que le matcher couvre tout le site, une
 * URL que le proxy ne reconnaît pas est réécrite vers la page introuvable, avec
 * un statut 404. Un fichier de `public/` n'est pas dans le manifeste des pages —
 * il n'en est pas une —, donc s'il traverse le proxy, il **disparaît**. C'est
 * arrivé : la première version du matcher énumérait ses exceptions à la main et
 * ignorait `resume/`, ce qui a rendu les deux CV inaccessibles alors qu'ils sont
 * en ligne depuis la Phase 2.
 *
 * ⚠️ Le mode de panne est silencieux et **de la pire espèce** : la réponse est
 * une page correcte, avec le bon statut pour une adresse qui n'existe pas. Rien
 * n'échoue, rien n'est journalisé comme une erreur, et le fichier est
 * simplement introuvable.
 *
 * **Ce test ne nomme aucun fichier** : il parcourt `public/` et vérifie une
 * propriété de chacun. Un CV renommé, une image ajoutée, un dossier créé — il
 * les couvre le jour où ils arrivent, ce qu'une liste écrite ici ne ferait pas
 * (c'est la faute qu'il existe pour empêcher).
 */
import { readdir } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'

import { describe, expect, it } from 'vitest'

import { config } from '@/proxy'

const PUBLIC_DIR = join(process.cwd(), 'public')

/** Ancré comme Next l'applique : sans `^…$`, le motif correspondrait partout. */
const matcher = new RegExp(`^${config.matcher[0] as string}$`)

/** Les URL que Next sert depuis `public/`, à la racine du site. */
async function publicUrlPaths(): Promise<string[]> {
  const entries = await readdir(PUBLIC_DIR, { recursive: true, withFileTypes: true })

  return entries
    .filter((entry) => entry.isFile())
    .map(
      (entry) =>
        `/${relative(PUBLIC_DIR, join(entry.parentPath, entry.name)).split(sep).join('/')}`,
    )
}

describe('ressources servies depuis public/', () => {
  it('en trouve à inspecter', async () => {
    // Un parcours qui ne trouve rien rendrait l'assertion suivante verte pour la
    // pire des raisons — la panne de `phase-2-log.md` §10.5, rejouée ici.
    expect((await publicUrlPaths()).length).toBeGreaterThan(0)
  })

  it('aucune ne traverse le proxy, donc aucune ne peut être réécrite en 404', async () => {
    const intercepted = (await publicUrlPaths()).filter((path) => matcher.test(path))

    expect(intercepted).toEqual([])
  })

  it('une page, elle, traverse bien le proxy', async () => {
    // Le complément indispensable : un motif qui n'intercepte **rien** ferait
    // passer l'assertion ci-dessus tout en supprimant la 404 localisée.
    expect(matcher.test('/fr/projects/inconnu')).toBe(true)
    expect(matcher.test('/rien')).toBe(true)
    expect(matcher.test('/')).toBe(true)
  })
})
