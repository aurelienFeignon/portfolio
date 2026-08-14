/**
 * Les noms de la liste blanche, **sans les composants** (P2-08, révisé).
 *
 * Ce fichier existe parce que le gate de contenu tourne sous `node` seul et ne
 * peut pas charger `components.tsx`, qui contient du JSX. Il a pourtant besoin de
 * savoir ce qui est autorisé, sinon il ne peut pas vérifier les corps.
 *
 * `components.tsx` est contraint de couvrir exactement cette liste : une
 * divergence entre les deux ne se lit pas, elle **ne compile pas**.
 */
export const MDX_COMPONENT_NAMES = ['Callout'] as const

export type MdxComponentName = (typeof MDX_COMPONENT_NAMES)[number]
