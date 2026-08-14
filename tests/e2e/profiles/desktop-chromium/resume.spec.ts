/**
 * Le CV est servi, et n'est pas indexable.
 *
 * Ce test ne dépend d'aucun profil : il n'observe qu'une réponse HTTP. Il est
 * donc joué **une seule fois**, sur `desktop-chromium`, plutôt que quatre fois
 * pour le même résultat.
 *
 * Il tourne contre l'**image de production** dans `make ci` : c'est le seul
 * endroit où l'on constate ce que le serveur envoie réellement, plutôt que ce que
 * la configuration prétend.
 */
import { expect, test } from '../../support/test'

const RESUMES = ['/resume/cv-fr.pdf', '/resume/cv-en.pdf']

test.describe('CV', () => {
  for (const path of RESUMES) {
    test(`${path} est servi en PDF`, async ({ request }) => {
      const response = await request.get(path)

      expect(response.status()).toBe(200)
      expect(response.headers()['content-type']).toContain('application/pdf')
    })

    test(`${path} n’est pas indexable`, async ({ request }) => {
      const response = await request.get(path)

      // Un PDF indexé ressort seul dans les résultats, détaché du site qui lui
      // donne son contexte. Il reste accessible par lien et par e-mail.
      expect(response.headers()['x-robots-tag']).toContain('noindex')
    })
  }

  test('les pages du site, elles, restent indexables', async ({ request }) => {
    const response = await request.get('/')

    expect(response.headers()['x-robots-tag']).toBeUndefined()
  })
})
