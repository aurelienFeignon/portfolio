import { expect, test } from '../../support/test'

/**
 * Le profil `reduced-motion` est vérifié lui-même, pour la même raison que
 * `no-webgl` : un profil qui n'émule rien passe au vert sans rien prouver.
 *
 * La preuve que les animations sont réellement supprimées viendra en Phase 6,
 * quand il y aura des transitions de caméra à supprimer (E2E-14). Ici, on
 * vérifie que la préférence est bien transmise au navigateur — sans quoi ce test
 * futur serait faux dès son écriture.
 */
test.describe('profil reduced-motion', () => {
  test('la préférence est effectivement transmise au navigateur', async ({ page }) => {
    await page.goto('/fr')

    const prefersReduce = await page.evaluate(
      () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    )
    expect(prefersReduce).toBe(true)
  })
})
