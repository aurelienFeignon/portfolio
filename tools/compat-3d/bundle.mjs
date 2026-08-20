// Ce que pèsent VRAIMENT les paquets, dans la forme où le site les servirait.
// ⛔ Les entrées doivent être COMPARABLES : mesurer `export *` d'un côté et cinq
// symboles nommés de l'autre a produit un « sur-ensemble plus léger que son
// sous-ensemble », c'est-à-dire une mesure qui ne mesurait rien.
import { build } from 'esbuild'
import { gzipSync } from 'node:zlib'

// Une scène réaliste, telle que P5-05 l'écrira, en trois variantes qui ne
// diffèrent QUE par la présence de drei.
const SCENE_SANS_DREI = `
  import { Canvas } from '@react-three/fiber'
  export const App = () => Canvas
`
const SCENE_AVEC_DREI = `
  import { Canvas } from '@react-three/fiber'
  import { Center } from '@react-three/drei'
  export const App = () => [Canvas, Center]
`
const SCENE_DREI_ELARGI = `
  import { Canvas } from '@react-three/fiber'
  import { Center, Environment, OrbitControls, Text } from '@react-three/drei'
  export const App = () => [Canvas, Center, Environment, OrbitControls, Text]
`

const cas = [
  { nom: 'three seul (export *)', code: `export * from 'three'` },
  { nom: 'R3F + three, scène sans drei', code: SCENE_SANS_DREI },
  { nom: '  + drei, UN composant (<Center>)', code: SCENE_AVEC_DREI },
  { nom: '  + drei, QUATRE composants', code: SCENE_DREI_ELARGI },
  {
    nom: '  + drei ENTIER (export *)',
    code: `export * from '@react-three/fiber'; export * from '@react-three/drei'`,
  },
]

const ko = (n) => (n / 1024).toFixed(1).padStart(7) + ' Ko'
for (const { nom, code } of cas) {
  const out = await build({
    stdin: { contents: code, resolveDir: process.cwd(), loader: 'ts' },
    bundle: true,
    minify: true,
    format: 'esm',
    write: false,
    external: ['react', 'react-dom', 'react/jsx-runtime'],
    target: 'es2022',
    logLevel: 'silent',
  })
  const octets = out.outputFiles[0].contents
  console.log(
    `${nom.padEnd(36)} minifié ${ko(octets.byteLength)}   gzip ${ko(gzipSync(octets).byteLength)}`,
  )
}
