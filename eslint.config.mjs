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
 *   app/              →  content, i18n, routing, ui, scene, seo
 *
 * Deux écarts par rapport à §1.2, l'un corrigé et l'autre ajouté — voir
 * `phase-1-log.md` §5 bis :
 *   - `app → scene` était absent de §1.2 alors que §5.1 fait monter le canvas par
 *     le layout. Contradiction interne du document, tranchée en faveur de §5.1.
 *   - `seo` ne figurait dans aucune liste. Contrainte posée par défaut, à
 *     confirmer en P3-06.
 *
 * **P3-06 confirme `seo → i18n, routing` et ajoute `app → seo`** (`phase-3-log.md`).
 * Le second est la même omission que `app → scene` : §1.2 ne cite pas `seo` parmi
 * les dépendances d'`app`, alors que §9 du même document fait alimenter
 * `generateMetadata` — qui ne peut vivre que dans `app` — par cette couche. Sans
 * cette autorisation, aucune page ne peut porter de `canonical`.
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
const COMPOSITION_ROOTS = [
  { target: './scripts', label: 'scripts', allowed: ['content', 'i18n', 'routing', 'ui', 'seo'] },
  // `src/proxy.ts` n'est dans aucune couche : il négocie la langue de `/` et
  // redirige (P3-03). Sans cette déclaration il échapperait entièrement au
  // graphe — or c'est un point d'entrée exécuté à chaque visite de la racine, et
  // donc le dernier endroit où l'on veut pouvoir importer n'importe quoi.
  { target: './src/proxy.ts', label: 'src/proxy.ts', allowed: ['i18n', 'routing'] },
]

const ALLOWED = {
  content: ['i18n'],
  i18n: [],
  routing: ['i18n'],
  scene: ['routing', 'i18n'],
  ui: ['i18n'],
  features: ['i18n'],
  seo: ['i18n', 'routing'],
  app: ['content', 'i18n', 'routing', 'ui', 'scene', 'seo'],
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
  ...COMPOSITION_ROOTS.flatMap(({ target, label, allowed }) =>
    LAYERS.filter((layer) => !allowed.includes(layer)).map((forbidden) => ({
      target,
      from: `./src/${forbidden}`,
      message: `\`${label}\` ne peut pas importer \`src/${forbidden}\` (architecture.md §1.2).`,
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

  // ⛔⛔ `drei` s'importe COMPOSANT PAR COMPOSANT (ADR-0016). Ce n'est pas une
  // préférence de style, c'est le budget de la phase, et il est mesuré :
  //
  //   R3F + three, sans drei ............ 237,5 Ko gzip
  //   + drei, UN composant .............. 238,4 Ko   (+0,9)
  //   + drei ENTIER ..................... 802,8 Ko   = 2,5 x le seuil bloquant
  //
  // ⚠️ Cette règle ne couvre que le cas CATASTROPHIQUE — l'import global. Quatre
  // composants nommés suffisent à consommer 80 % du seuil, et aucune règle de
  // lint ne pèse des octets : la mesure du chunk réel est P5-04 / P5-09.
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'ImportDeclaration[source.value=/^@react-three\\/drei(\\/|$)/] > ImportNamespaceSpecifier',
          message:
            'drei s’importe composant par composant (ADR-0016) : `import * as` embarque tout le paquet, soit 802,8 Ko gzip — 2,5 fois le seuil bloquant de la phase.',
        },
        {
          selector: 'ExportAllDeclaration[source.value=/^@react-three\\/drei(\\/|$)/]',
          message:
            'Un `export *` de drei embarque tout le paquet (802,8 Ko gzip, ADR-0016). Réexporte les composants un par un, ou n’en réexporte aucun.',
        },
        {
          // ⛔ La forme que P5-04 va écrire : le canvas est monté par import
          // DYNAMIQUE (`ssr: false`, ADR-0003). Un `await import('@react-three/drei')`
          // embarque le paquet entier dans le chunk différé — le poids change de
          // moment, pas de valeur.
          selector: 'ImportExpression[source.value=/^@react-three\\/drei(\\/|$)/]',
          message:
            'Même dynamique, un import du paquet drei entier pèse 802,8 Ko gzip (ADR-0016). Importe les composants nommés depuis le module de scène, qui est lui-même chargé dynamiquement.',
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
