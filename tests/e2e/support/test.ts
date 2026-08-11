import { test as base } from '@playwright/test'
import { disableWebGL } from './disable-webgl'

/**
 * `test` étendu : applique automatiquement la neutralisation de WebGL aux
 * projets qui la déclarent (`metadata.disableWebGL`).
 *
 * Playwright n'offre pas de script d'initialisation au niveau du projet ; le
 * faire ici évite de le répéter — donc de l'oublier — dans chaque test du
 * profil `no-webgl`.
 *
 * Tous les tests E2E importent `test` depuis ce module, jamais depuis
 * `@playwright/test` directement.
 *
 * Le second paramètre du fixture s'appelle `use` dans la documentation
 * Playwright ; il est renommé ici, faute de quoi la règle `react-hooks` le prend
 * pour le hook React `use`.
 */
export const test = base.extend({
  page: async ({ page }, provide, testInfo) => {
    if (testInfo.project.metadata['disableWebGL'] === true) {
      await page.addInitScript(disableWebGL)
    }
    await provide(page)
  },
})

export { expect } from '@playwright/test'
