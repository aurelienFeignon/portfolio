// Preuve d'EXÉCUTION, en JS pur : Node ne sait pas charger du .tsx, et la
// vérification des TYPES est déjà faite par tsc sur `scene.tsx`. Ce qui se
// prouve ici est autre chose — que le réconciliateur de R3F monte réellement
// une scène sous React 19.2.8, ce qu'aucun `peerDependencies` ne dit.
import { createElement as h } from 'react'
import { version as reactVersion } from 'react'
import ReactThreeTestRenderer from '@react-three/test-renderer'
import { Center } from '@react-three/drei'

const Bureau = () =>
  h(
    'group',
    null,
    h('ambientLight', { intensity: 0.4 }),
    h(
      Center,
      null,
      h(
        'mesh',
        { position: [0, 0.5, 0] },
        h('boxGeometry', { args: [1.6, 0.9, 0.05] }),
        h('meshStandardMaterial', { color: '#1a1a1a', roughness: 0.4 }),
      ),
    ),
  )

const renderer = await ReactThreeTestRenderer.create(h(Bureau))
const meshes = renderer.scene.findAllByType('Mesh')
const lumieres = renderer.scene.findAllByType('AmbientLight')

console.log('react            :', reactVersion)
console.log('meshes montés    :', meshes.length)
console.log('lumières montées :', lumieres.length)
console.log('géométrie réelle :', meshes[0]?.instance?.geometry?.type ?? '(aucune)')
console.log('drei <Center>    :', renderer.scene.findAllByType('Group').length, 'groupes')

if (meshes.length !== 1 || lumieres.length !== 1) {
  console.error('✗ la scène ne porte pas ce qui a été déclaré')
  process.exitCode = 1
} else {
  console.log('✓ scène montée par R3F et parcourue, sans WebGL')
}
await renderer.unmount()
