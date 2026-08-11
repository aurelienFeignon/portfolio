import { defineConfig, devices } from '@playwright/test'

// Le service `e2e` cible le service `web` par le réseau Docker interne. La
// variable permet de viser une autre origine (build de production en P1-13, CI).
const baseURL = process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://web:3000'

export default defineConfig({
  testDir: './tests/e2e',
  // Artefacts dans des dossiers ignorés par Git (P1-08).
  outputDir: './test-results',
  fullyParallel: true,
  // Un `test.only` oublié ne doit pas faire passer une CI en vert sur trois tests.
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI']
    ? [['github'], ['html', { outputFolder: 'playwright-report', open: 'never' }]]
    : [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  // Les cinq profils de `testing-strategy.md` §4.7. Ils sont déclarés dès
  // maintenant, même si certains n'ont encore qu'un test : un profil qui
  // n'existe pas ne sera jamais ajouté au moment où il servirait.
  //
  // Découpage des fichiers :
  //   tests/e2e/shared/**    parcours communs, joués par tous les profils qui
  //                          disposent de JavaScript
  //   tests/e2e/profiles/X/  ce qui n'a de sens que pour le profil X
  //
  // Sans ce découpage, un test propre à un profil s'exécute dans tous les autres
  // et passe pour de mauvaises raisons — constaté au premier essai (P1-08).
  projects: [
    {
      name: 'desktop-chromium',
      testMatch: '**/shared/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile-safari',
      testMatch: '**/shared/**/*.spec.ts',
      use: { ...devices['iPhone 14'] },
    },
    {
      // Prouve CF-12 : le portfolio reste entièrement utilisable sans WebGL.
      // La neutralisation est faite par un script d'initialisation injecté avant
      // tout script de page (voir `tests/e2e/support/test.ts`), et non par un
      // drapeau de lancement : un drapeau peut laisser SwiftShader répondre.
      name: 'no-webgl',
      testMatch: ['**/shared/**/*.spec.ts', '**/profiles/no-webgl/**/*.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
      metadata: { disableWebGL: true },
    },
    {
      // Prouve que le contenu et, plus tard, le formulaire CV existent sans JS.
      // Ne joue pas les parcours communs : l'audit axe injecte et exécute un
      // script dans la page, ce qui est par construction impossible ici.
      name: 'no-js',
      testMatch: '**/profiles/no-js/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'], javaScriptEnabled: false },
    },
    {
      name: 'reduced-motion',
      testMatch: ['**/shared/**/*.spec.ts', '**/profiles/reduced-motion/**/*.spec.ts'],
      // `reducedMotion` est une option de contexte, pas une option de test : le
      // placer directement dans `use` compile en apparence mais ne s'applique
      // pas (erreur de type relevée au build de production, P1-13).
      use: { ...devices['Desktop Chrome'], contextOptions: { reducedMotion: 'reduce' } },
    },
  ],
})
