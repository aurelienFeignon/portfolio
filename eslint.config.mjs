import js from '@eslint/js'
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypeScript from 'eslint-config-next/typescript'
import prettier from 'eslint-config-prettier'
import importPlugin from 'eslint-plugin-import'
import tseslint from 'typescript-eslint'

/**
 * Graphe de dépendances autorisé entre modules — `architecture.md` §1.2.
 *
 *   content/          →  (rien)
 *   i18n/             →  (rien)
 *   routing/          →  i18n
 *   scene/            →  routing, i18n              jamais content
 *   ui/               →  i18n
 *   features/         →  i18n
 *   seo/              →  i18n, routing
 *   app/              →  content, i18n, routing, ui, scene
 *
 * Deux écarts par rapport à §1.2, l'un corrigé et l'autre ajouté — voir
 * `phase-1-log.md` §5 bis :
 *   - `app → scene` était absent de §1.2 alors que §5.1 fait monter le canvas par
 *     le layout. Contradiction interne du document, tranchée en faveur de §5.1.
 *   - `seo` ne figurait dans aucune liste. Contrainte posée par défaut, à
 *     confirmer en P3-06.
 *
 * Une règle d'architecture non vérifiée est une intention, pas une contrainte :
 * celle-ci est prouvée par un échec observé (P1-05).
 */
const LAYERS = ['content', 'i18n', 'routing', 'scene', 'ui', 'features', 'seo', 'app']

const ALLOWED = {
  content: [],
  i18n: [],
  routing: ['i18n'],
  scene: ['routing', 'i18n'],
  ui: ['i18n'],
  features: ['i18n'],
  seo: ['i18n', 'routing'],
  app: ['content', 'i18n', 'routing', 'ui', 'scene'],
}

const zones = LAYERS.flatMap((layer) =>
  LAYERS.filter((other) => other !== layer && !ALLOWED[layer].includes(other)).map((forbidden) => ({
    target: `./src/${layer}`,
    from: `./src/${forbidden}`,
    message: `\`src/${layer}\` ne peut pas importer \`src/${forbidden}\` (architecture.md §1.2).`,
  })),
)

export default tseslint.config(
  {
    ignores: ['.next/**', 'node_modules/**', 'coverage/**', 'next-env.d.ts'],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...nextCoreWebVitals,
  ...nextTypeScript,

  // --- Cloisonnement des couches ------------------------------------------
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { import: importPlugin },
    settings: {
      'import/resolver': {
        typescript: { alwaysTryTypes: true, project: './tsconfig.json' },
      },
    },
    rules: {
      'import/no-restricted-paths': ['error', { zones }],
    },
  },

  // La couche Content est du TypeScript pur : ni React, ni Three.js (CT-09).
  // C'est ce qui la rend testable sans DOM et réutilisable hors rendu.
  {
    files: ['src/content/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react/*', 'react-dom/*', 'next/*'],
              message: 'La couche Content ne dépend pas de React ni de Next (CT-09).',
            },
            {
              group: ['three', 'three/*', '@react-three/*'],
              message: 'La couche Content ne dépend jamais de Three.js (CT-09).',
            },
          ],
        },
      ],
    },
  },

  // L'état de scène est une fonction pure de l'URL : zéro Three.js, sans quoi la
  // Phase 6 ne serait pas testable en Vitest pur (CT-10).
  {
    files: ['src/scene/state/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['three', 'three/*', '@react-three/*'],
              message:
                '`src/scene/state` doit rester testable sans WebGL : aucun import Three.js (CT-10).',
            },
          ],
        },
      ],
    },
  },

  // En dernier : neutralise les règles ESLint qui se battraient avec Prettier.
  prettier,
)
