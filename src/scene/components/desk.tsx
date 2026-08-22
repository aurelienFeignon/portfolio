'use client'

/**
 * Le bureau — la scène primitive de P5-05.
 *
 * Il ne décide de rien : il **rend** ce que `layout.ts` décrit, et ce fichier de
 * données est le seul à porter une cote. Chercher ici pourquoi un chanfrein vaut
 * 8 mm ou pourquoi le portable est à 0° de lacet serait chercher au mauvais
 * endroit — les raisons vivent auprès des valeurs.
 *
 * ⛔ Aucun texte, aucune information : le canvas est `aria-hidden`, et rien n'y
 * existe qui ne soit dans le DOM (ADR-0003).
 */
import { useMemo } from 'react'
import {
  BufferGeometry,
  BoxGeometry,
  CylinderGeometry,
  Float32BufferAttribute,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
} from 'three'

import type { Capability } from '@/scene/capability/resolve'
import { chamferBox, type Mesh as MeshData, mergeKeyField } from '@/scene/state/geometry'
import {
  KEY_FIELDS,
  LIGHTS,
  MATERIALS,
  type MaterialId,
  NODES,
  type Vec3,
} from '@/scene/state/layout'

const RADIAN = Math.PI / 180
const enRadians = (degres: Vec3): Vec3 => [
  degres[0] * RADIAN,
  degres[1] * RADIAN,
  degres[2] * RADIAN,
]

/**
 * ⭐ **Géométrie NON indexée, normales recalculées.** Les sommets partagés
 * feraient moyenner les normales entre une face et la facette de son chanfrein —
 * exactement le lissage que le chanfrein existe pour éviter. Dédoublés, chaque
 * triangle porte la sienne, et la facette accroche sa propre valeur de lumière.
 *
 * ⚠️ Ce n'est **pas** `flatShading` sur le matériau : celui-ci est mutualisé, et
 * facetterait aussi la souris et l'abat-jour, dont le galbe est tout ce qui les
 * rend reconnaissables.
 */
function versGeometrie(data: MeshData): BufferGeometry {
  const geometrie = new BufferGeometry()
  geometrie.setAttribute('position', new Float32BufferAttribute([...data.positions], 3))
  geometrie.setIndex([...data.indices])
  const plate = geometrie.toNonIndexed()
  plate.computeVertexNormals()
  geometrie.dispose()
  return plate
}

/**
 * Les quatre géométries unitaires, partagées par toute la scène et mises à
 * l'échelle par instance. Les segments sont ceux qui donnent les comptes du
 * dossier : 96 triangles par cylindre, 720 par sphère.
 */
function useGeometriesPartagees(): Record<'box' | 'cylinder' | 'sphere' | 'plane', BufferGeometry> {
  return useMemo(
    () => ({
      box: new BoxGeometry(1, 1, 1),
      cylinder: new CylinderGeometry(0.5, 0.5, 1, 24),
      sphere: new SphereGeometry(0.5, 24, 16),
      plane: new PlaneGeometry(1, 1),
    }),
    [],
  )
}

function useMateriaux(): Record<MaterialId, MeshStandardMaterial> {
  return useMemo(() => {
    const entrees = Object.entries(MATERIALS).map(([id, spec]) => {
      const materiau = new MeshStandardMaterial({
        color: spec.color,
        roughness: spec.roughness,
        metalness: spec.metalness,
      })
      if (spec.emissive !== undefined) {
        materiau.emissive.set(spec.emissive)
        materiau.emissiveIntensity = spec.emissiveIntensity ?? 1
      }
      return [id, materiau] as const
    })
    return Object.fromEntries(entrees) as Record<MaterialId, MeshStandardMaterial>
  }, [])
}

export function Desk({ capability }: { readonly capability: Capability }) {
  /*
   * ⭐ Le palier `lite` est le profil « mobile » du dossier : les objets marqués
   * `desktopOnly` en sont écartés, ce qui ramène la scène de 30 à 20 draw calls
   * et de 4 114 à 1 966 triangles. Ce sont les deux claviers qui pèsent le plus —
   * un détail qu'on ne lit pas sur un écran de téléphone.
   */
  const allege = capability.tier === 'lite'
  const partagees = useGeometriesPartagees()
  const materiaux = useMateriaux()

  const nodes = useMemo(
    () => NODES.filter((node) => !(allege && node.desktopOnly === true)),
    [allege],
  )

  /*
   * ⭐ La géométrie est résolue AVEC son nœud, et non rangée dans une table
   * qu'on interrogerait ensuite. Une table rend un `undefined` possible là où il
   * ne l'est pas — et le seul moyen de le taire serait un repli qui masquerait
   * un vrai trou le jour où il s'en produirait un.
   */
  const rendus = useMemo(
    () =>
      nodes.map((node) => ({
        node,
        // Le chanfrein est une longueur absolue : chaque boîte porte la sienne.
        geometrie:
          node.shape === 'chamferBox'
            ? versGeometrie(chamferBox(node.size, node.chamfer ?? 0))
            : partagees[node.shape],
      })),
    [nodes, partagees],
  )

  const champs = useMemo(
    () =>
      KEY_FIELDS.filter((field) => !(allege && field.desktopOnly === true)).map((field) => ({
        field,
        geometrie: versGeometrie(mergeKeyField(field.keys, field.height, field.taper)),
      })),
    [allege],
  )

  return (
    <group>
      {LIGHTS.map((light, index) =>
        light.kind === 'hemisphere' ? (
          <hemisphereLight
            key={index}
            args={[light.skyColor, light.groundColor, light.intensity]}
          />
        ) : light.kind === 'directional' ? (
          <directionalLight
            key={index}
            color={light.color}
            intensity={light.intensity}
            position={light.position as unknown as [number, number, number]}
            castShadow={light.castShadow}
            shadow-mapSize-width={light.shadowMapSize}
            shadow-mapSize-height={light.shadowMapSize}
            shadow-camera-left={-light.shadowExtent}
            shadow-camera-right={light.shadowExtent}
            shadow-camera-top={light.shadowExtent}
            shadow-camera-bottom={-light.shadowExtent}
            // ⛔ Un biais constant décolle l'ombre de son objet — le
            // « peter-panning », très visible sur des boîtes posées à plat. Le
            // biais selon la normale ne produit pas ce détachement.
            shadow-normalBias={0.02}
            shadow-bias={0}
          />
        ) : (
          <pointLight
            key={index}
            color={light.color}
            intensity={light.intensity}
            position={light.position as unknown as [number, number, number]}
            distance={light.distance}
            // Explicite : la valeur par défaut de three a changé selon les versions.
            decay={light.decay}
          />
        ),
      )}

      {rendus.map(({ node, geometrie }) => (
        <mesh
          key={node.id}
          geometry={geometrie}
          material={materiaux[node.material]}
          position={node.position as unknown as [number, number, number]}
          rotation={enRadians(node.rotationDeg) as unknown as [number, number, number]}
          // Une boîte chanfreinée porte déjà ses cotes : la remettre à l'échelle
          // transformerait son chanfrein en biseau de largeur variable selon l'axe.
          scale={
            node.shape === 'chamferBox'
              ? [1, 1, 1]
              : (node.size as unknown as [number, number, number])
          }
          castShadow={node.castShadow}
          receiveShadow={node.receiveShadow}
        />
      ))}

      {champs.map(({ field, geometrie }) => (
        <mesh
          key={field.id}
          geometry={geometrie}
          material={materiaux[field.material]}
          position={field.position as unknown as [number, number, number]}
          rotation={enRadians(field.rotationDeg) as unknown as [number, number, number]}
          castShadow
          receiveShadow={false}
        />
      ))}
    </group>
  )
}
