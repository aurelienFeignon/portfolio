// Une scène représentative : primitives R3F + un composant drei, exactement ce
// que P5-05 écrira. Le but est de faire porter la vérification sur les TYPES
// réellement utilisés, pas sur un `import` symbolique.
import { Center } from '@react-three/drei'
import type { ThreeElements } from '@react-three/fiber'
import type { Mesh } from 'three'
import { useRef } from 'react'

export function Bureau(props: ThreeElements['group']) {
  const ecran = useRef<Mesh>(null)
  return (
    <group {...props}>
      <ambientLight intensity={0.4} />
      <directionalLight position={[2, 4, 3]} intensity={1.2} />
      <Center>
        <mesh ref={ecran} position={[0, 0.5, 0]}>
          <boxGeometry args={[1.6, 0.9, 0.05]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.4} />
        </mesh>
      </Center>
    </group>
  )
}
