import path from 'node:path'
import { defineConfig } from 'vitest/config'

const alias = { '@': path.resolve(import.meta.dirname, 'src') }

// Deux environnements, pas un seul (testing-strategy.md §2) :
//   - `node`  : parsing, schémas, i18n, routing, état de scène, rate limit.
//               Rapide, et surtout : ces modules doivent tourner sans DOM. Les
//               exécuter sous jsdom masquerait une dépendance au navigateur.
//   - `jsdom` : composants React via Testing Library.
export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'node',
          environment: 'node',
          include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
        },
      },
      {
        resolve: { alias },
        test: {
          name: 'components',
          environment: 'jsdom',
          include: ['tests/components/**/*.test.tsx'],
          setupFiles: ['./tests/setup/testing-library.ts'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      // Mesure aussi les fichiers qu'aucun test ne touche : sans cela, un module
      // entièrement non testé n'apparaît pas et le pourcentage global ment.
      all: true,
      include: ['src/**/*.{ts,tsx}'],
      // Exclusions explicites et limitées (testing-strategy.md §6). Exclure un
      // module métier pour atteindre un seuil serait une fraude, et la
      // Definition of Done l'interdit.
      exclude: [
        // Rendu R3F : couvert par les E2E, pas par Vitest.
        'src/scene/components/**',
        // Layouts sans logique : composition seule, vérifiée en E2E.
        'src/app/**/layout.tsx',
        // Routes de l'App Router : **composition seule**, ajoutée en P3-02.
        //
        // Elles lisent le dépôt de contenu et passent les données à des modules
        // qui, eux, sont couverts : `languageOptions`, `pageMetadata`,
        // `buildSitemap`, `entitySitemapPages`, et les composants de `src/ui`.
        // Toute décision à branches en a été **sortie** pour cette raison — c'est
        // l'origine de `src/ui/date-range.tsx`, qui porte le cas « en cours ».
        //
        // Elles ne sont pas pour autant non vérifiées : les E2E les exercent
        // contre l'**image de production**, ce qu'un rendu jsdom ne ferait pas.
        // Les couvrir en Vitest supposerait par ailleurs de leur faire lire
        // `content/`, ce que le garde-fou d'indépendance des fixtures interdit
        // (P2-09) — un test de page casserait dès que P2-11 réécrit un projet.
        'src/app/**/page.tsx',
        'src/app/sitemap.ts',
        'src/app/robots.ts',
        // Frontières d'erreur (P4-07) : même nature que les layouts ci-dessus —
        // une ligne de composition chacune, plus l'enveloppe `<html>` que Next
        // impose à `global-error`. Elles sont admissibles ici **parce que** la
        // seule décision qu'elles portaient en a été sortie : la langue à
        // afficher quand on n'a que l'URL est `displayedLocale`, dans
        // `src/routing`, couverte à 100 %. C'est la règle de §6 appliquée telle
        // qu'elle est écrite — « le jour où une route se remet à décider quelque
        // chose, la décision se sort de la route ».
        //
        // Ce qu'elles rendent est vérifié ailleurs : `ErrorNotice` a ses tests
        // de composant. Les couvrir ici demanderait de simuler `usePathname`,
        // donc d'introduire le mock comme pratique du dépôt — pour deux lignes.
        'src/app/**/error.tsx',
        'src/app/global-error.tsx',
        // Plancher sous le mécanisme de 404 (P4-10) : même nature que
        // `global-error.tsx` ci-dessus — une enveloppe `<html>` que Next impose
        // de rendre soi-même, et de la composition pure en dessous. Elle ne
        // porte **aucune** décision à branches : la langue est `DEFAULT_LOCALE`,
        // faute de `params` à cet endroit, et c'est précisément ce qui la
        // distingue de la 404 localisée. Ce qu'elle garantit — un `lang` sur les
        // voies que le proxy n'atteint pas — est vérifié par un parcours contre
        // l'image de production, mesuré avant/après.
        'src/app/global-not-found.tsx',
        // Routes de **métadonnée** de l'App Router (P4-08) : `icon.tsx` et
        // `opengraph-image.tsx` ne rendent pas du HTML mais une image, et leur
        // corps est de la composition — une seule décision les habitait, les
        // initiales d'un nom, et elle en a été **sortie** (`src/ui/initials.ts`,
        // couverte à 100 %). C'est la même règle que pour les pages, appliquée
        // telle qu'elle est écrite.
        //
        // Elles sont exercées par les parcours E2E contre l'image de production,
        // qui vérifient que l'adresse annoncée répond réellement une image — ce
        // qu'un rendu jsdom ne ferait pas.
        'src/app/**/opengraph-image.tsx',
        'src/app/icon.tsx',
        // Types purs et déclarations : rien à exécuter.
        'src/**/*.d.ts',
        'src/**/types.ts',
      ],
      thresholds: {
        // Seuils globaux — testing-strategy.md §6.
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
        // Modules critiques : la moyenne globale ne doit pas pouvoir masquer un
        // trou dans le parsing du contenu ou dans le rate limit.
        'src/content/**': { statements: 95, branches: 95, functions: 95, lines: 95 },
        'src/i18n/**': { statements: 95, branches: 95, functions: 95, lines: 95 },
        'src/routing/**': { statements: 95, branches: 95, functions: 95, lines: 95 },
        // Ajouté en P3-06 : cette phase a déplacé la vérité de R-07 —
        // `canonical`, `hreflang`, `x-default`, sitemap — dans `src/seo`. Le
        // laisser sous le seul plancher global (80 %) ferait du risque principal
        // de la phase le module le moins exigeant du projet.
        'src/seo/**': { statements: 95, branches: 95, functions: 95, lines: 95 },
        'src/scene/state/**': { statements: 95, branches: 95, functions: 95, lines: 95 },
        'src/features/resume/**': { statements: 95, branches: 95, functions: 95, lines: 95 },
      },
    },
  },
})
