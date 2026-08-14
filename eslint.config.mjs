import js from '@eslint/js'
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypeScript from 'eslint-config-next/typescript'
import prettier from 'eslint-config-prettier'
import importPlugin from 'eslint-plugin-import'
import tseslint from 'typescript-eslint'

/**
 * Graphe de dépendances autorisé entre modules — `architecture.md` §1.2.
 *
 *   content/          →  i18n
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
 * Un troisième, ouvert en Phase 2 (`phase-2-log.md` §7) : `content → i18n`. Le
 * contenu est indexé par locale, donc typé par elle ; l'alternative était une
 * seconde liste de locales dans `src/content`. `i18n` ne dépendant de rien, cette
 * autorisation ne peut pas créer de cycle, et la couche Content reste du
 * TypeScript pur — c'est cela que CT-09 protège, pas l'absence de tout import.
 *
 * Une règle d'architecture non vérifiée est une intention, pas une contrainte :
 * celle-ci est prouvée par un échec observé (P1-05).
 */
const LAYERS = ['content', 'i18n', 'routing', 'scene', 'ui', 'features', 'seo', 'app']

/**
 * `scripts/` n'est pas une couche : c'est une **racine de composition**, au même
 * titre qu'`app`. Le gate de contenu y assemble légitimement `content` et `ui`.
 *
 * Le déclarer ici plutôt que de le laisser hors du graphe : sans cela, rien
 * n'empêcherait d'y loger de la logique métier précisément pour échapper au
 * cloisonnement. Ajouté en revue — le dépôt pose lui-même le standard qu'une
 * règle d'architecture non vérifiée est une intention.
 */
const COMPOSITION_ROOTS = { scripts: ['content', 'i18n', 'routing', 'ui', 'seo'] }

const ALLOWED = {
  content: ['i18n'],
  i18n: [],
  routing: ['i18n'],
  scene: ['routing', 'i18n'],
  ui: ['i18n'],
  features: ['i18n'],
  seo: ['i18n', 'routing'],
  app: ['content', 'i18n', 'routing', 'ui', 'scene'],
}

const zones = [
  ...LAYERS.flatMap((layer) =>
    LAYERS.filter((other) => other !== layer && !ALLOWED[layer].includes(other)).map(
      (forbidden) => ({
        target: `./src/${layer}`,
        from: `./src/${forbidden}`,
        message: `\`src/${layer}\` ne peut pas importer \`src/${forbidden}\` (architecture.md §1.2).`,
      }),
    ),
  ),
  ...Object.entries(COMPOSITION_ROOTS).flatMap(([root, allowed]) =>
    LAYERS.filter((layer) => !allowed.includes(layer)).map((forbidden) => ({
      target: `./${root}`,
      from: `./src/${forbidden}`,
      message: `\`${root}\` ne peut pas importer \`src/${forbidden}\` (architecture.md §1.2).`,
    })),
  ),
]

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
    files: ['src/**/*.{ts,tsx}', 'scripts/**/*.mts'],
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

  // Modules atteignables par `node` seul : le gate de contenu les charge sans
  // bundler, donc sans JSX ni React. La contrainte est identique à celle de
  // `src/content/**` (CT-09), et pour la même raison — la faute passerait `tsc`
  // et Vitest, et n'échouerait qu'à `pnpm build`. Posée en revue.
  {
    files: ['src/ui/mdx/inspect.ts', 'src/ui/mdx/whitelist.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react/*', 'react-dom/*', 'next/*'],
              message:
                'Ce module est chargé par `scripts/check-content.mts` sous `node` seul : ni React, ni JSX.',
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
