/**
 * Plan coté du bureau, en données pures.
 *
 * Aucun import de three, aucun JSX : ce module doit rester testable sans contexte WebGL.
 * Repère : origine au centre de la face supérieure du plateau, X vers la droite,
 * Y vers le haut, Z vers l'utilisateur. Unités en mètres, rotations en degrés (ordre XYZ).
 *
 * Les dimensions sont exprimées avant rotation, sous la forme (largeur, hauteur, profondeur).
 * Pour un cylindre : (diamètre, hauteur, diamètre). Pour une sphère : (diamètre, ×3).
 * Pour un plan : (largeur, hauteur, 1) — le plan est dans XY et regarde +Z avant rotation.
 */

export type Vec3 = readonly [number, number, number]

/* ------------------------------------------------------------------ matériaux */

export const MATERIAL_IDS = [
  'bois',
  'metalNoir',
  'mur',
  'plinthe',
  'sol',
  'chassis',
  'dalleGauche',
  'dalleCentre',
  'dallePortable',
  'plastiqueNoir',
  'touches',
  'abatJour',
  'metalPoli',
  'siege',
] as const

export type MaterialId = (typeof MATERIAL_IDS)[number]

export interface MaterialSpec {
  readonly color: string
  readonly roughness: number
  readonly metalness: number
  /** Couleur d'émission, absente si la surface n'émet pas. */
  readonly emissive?: string
  /** Intensité relative de l'émission, à n'utiliser qu'avec `emissive`. */
  readonly emissiveIntensity?: number
}

export const MATERIALS: Readonly<Record<MaterialId, MaterialSpec>> = {
  bois: { color: '#B98F5E', roughness: 0.62, metalness: 0.0 },
  metalNoir: { color: '#1C1C1F', roughness: 0.55, metalness: 0.25 },
  mur: { color: '#C2B49B', roughness: 0.95, metalness: 0.0 },
  plinthe: { color: '#E4E0D6', roughness: 0.9, metalness: 0.0 },
  sol: { color: '#4A3524', roughness: 0.72, metalness: 0.0 },
  chassis: { color: '#202226', roughness: 0.4, metalness: 0.3 },
  dalleGauche: {
    color: '#12131A',
    roughness: 1.0,
    metalness: 0.0,
    emissive: '#1E2A46',
    emissiveIntensity: 1.1,
  },
  dalleCentre: {
    color: '#E8ECF2',
    roughness: 1.0,
    metalness: 0.0,
    emissive: '#DCE6F5',
    emissiveIntensity: 1.45,
  },
  dallePortable: {
    color: '#16121F',
    roughness: 1.0,
    metalness: 0.0,
    emissive: '#2A2140',
    emissiveIntensity: 0.95,
  },
  // Rugosité descendue de 0,70 à 0,45 : à 0,70 la facette d'un chanfrein rend la même
  // valeur que la face voisine et le chanfrein ne se voit pas, quelle que soit sa taille.
  plastiqueNoir: { color: '#17181B', roughness: 0.45, metalness: 0.05 },
  touches: { color: '#232428', roughness: 0.8, metalness: 0.0 },
  abatJour: {
    color: '#C0554A',
    roughness: 0.52,
    metalness: 0.0,
    emissive: '#C0554A',
    emissiveIntensity: 0.12,
  },
  metalPoli: { color: '#17181A', roughness: 0.35, metalness: 0.7 },
  siege: { color: '#26262A', roughness: 0.85, metalness: 0.0 },
}

/* ---------------------------------------------------------------------- noeuds */

/*
 * `chamferBox` est une boîte dont les 12 arêtes et les 8 coins sont coupés à plat :
 * 6 faces + 12 facettes d'arête + 8 facettes de coin, soit 44 triangles au lieu de 12.
 * Elle existe parce qu'une arête vive de matériau plastique n'accroche aucune lumière :
 * sans elle, le clavier et le portable se lisent comme de simples parallélépipèdes.
 * Le chanfrein étant une **longueur absolue**, ces objets ne peuvent pas partager une
 * géométrie unitaire mise à l'échelle — chacun porte la sienne. Cela n'a aucun effet
 * sur le nombre de draw calls, qui compte les meshes et non les géométries.
 */
export type Primitive = 'box' | 'chamferBox' | 'cylinder' | 'sphere' | 'plane'

interface NodeBase {
  readonly id: string
  /** (largeur, hauteur, profondeur) avant rotation. */
  readonly size: Vec3
  readonly position: Vec3
  readonly rotationDeg: Vec3
  readonly material: MaterialId
  readonly castShadow: boolean
  readonly receiveShadow: boolean
  /** Écarté du rendu mobile, pour tenir le budget de 30 draw calls. */
  readonly desktopOnly?: true
}

/**
 * ⛔⛔ **Le chanfrein n'est pas optionnel « pour `chamferBox` uniquement » : il
 * est REQUIS là, et interdit ailleurs.** Écrit `chamfer?: number` sur un nœud
 * unique, il obligeait le rendu à un repli — `node.chamfer ?? 0` —, et un
 * chanfrein nul produit une boîte à arêtes vives **plus 32 triangles
 * dégénérés**, sans une erreur. Un repli qui masque un état impossible est le
 * défaut que ce dépôt traque ailleurs ; ici, le type le rend inexprimable.
 * Relevé en revue (P5-05).
 *
 * Largeur en mètres, strictement inférieure à la moitié de la plus petite
 * dimension — au-delà, les facettes se croisent et la boîte se retourne.
 */
export type Node =
  | (NodeBase & { readonly shape: 'chamferBox'; readonly chamfer: number })
  | (NodeBase & { readonly shape: Exclude<Primitive, 'chamferBox'>; readonly chamfer?: never })

const ZERO: Vec3 = [0, 0, 0]

export const NODES: readonly Node[] = [
  /* --- décor ------------------------------------------------------------- */
  {
    id: 'sol',
    shape: 'plane',
    size: [8, 8, 1],
    position: [0, -0.75, 0],
    rotationDeg: [-90, 0, 0],
    material: 'sol',
    castShadow: false,
    receiveShadow: true,
  },
  {
    id: 'mur',
    shape: 'plane',
    size: [6, 3, 1],
    position: [0, -0.15, -0.45],
    rotationDeg: ZERO,
    material: 'mur',
    castShadow: false,
    receiveShadow: true,
  },
  {
    id: 'plinthe',
    shape: 'box',
    size: [6, 0.1, 0.02],
    position: [0, -0.7, -0.435],
    rotationDeg: ZERO,
    material: 'plinthe',
    castShadow: false,
    receiveShadow: true,
    desktopOnly: true,
  },

  /* --- bureau ------------------------------------------------------------ */
  {
    id: 'plateau',
    shape: 'chamferBox',
    chamfer: 0.006,
    size: [1.4, 0.025, 0.7],
    position: [0, -0.0125, 0],
    rotationDeg: ZERO,
    material: 'bois',
    castShadow: true,
    receiveShadow: true,
  },
  {
    id: 'colonneGauche',
    shape: 'box',
    size: [0.09, 0.65, 0.11],
    position: [-0.55, -0.4, -0.02],
    rotationDeg: ZERO,
    material: 'metalNoir',
    castShadow: true,
    receiveShadow: true,
  },
  {
    id: 'colonneDroite',
    shape: 'box',
    size: [0.09, 0.65, 0.11],
    position: [0.55, -0.4, -0.02],
    rotationDeg: ZERO,
    material: 'metalNoir',
    castShadow: true,
    receiveShadow: true,
  },
  {
    id: 'piedGauche',
    shape: 'box',
    size: [0.06, 0.04, 0.6],
    position: [-0.55, -0.73, -0.02],
    rotationDeg: ZERO,
    material: 'metalNoir',
    castShadow: true,
    receiveShadow: true,
  },
  {
    id: 'piedDroit',
    shape: 'box',
    size: [0.06, 0.04, 0.6],
    position: [0.55, -0.73, -0.02],
    rotationDeg: ZERO,
    material: 'metalNoir',
    castShadow: true,
    receiveShadow: true,
  },
  {
    id: 'traverse',
    shape: 'box',
    size: [1.05, 0.05, 0.06],
    position: [0, -0.09, -0.02],
    rotationDeg: ZERO,
    material: 'metalNoir',
    castShadow: true,
    receiveShadow: false,
  },
  {
    id: 'boitierCommande',
    shape: 'box',
    size: [0.13, 0.03, 0.04],
    position: [-0.22, -0.05, 0.33],
    rotationDeg: ZERO,
    material: 'plastiqueNoir',
    castShadow: false,
    receiveShadow: false,
    desktopOnly: true,
  },

  /* --- bras d'écran ------------------------------------------------------ */
  // Le mât est déporté à gauche de la dalle centrale : centré, son bras barrait l'écran
  // le plus cliquable de la scène (vérifié au rendu Blender).
  {
    id: 'matBras',
    shape: 'cylinder',
    size: [0.04, 0.48, 0.04],
    position: [-0.33, 0.22, -0.33],
    rotationDeg: ZERO,
    material: 'metalNoir',
    castShadow: true,
    receiveShadow: true,
  },
  // Chaque bras vise le centre du dos de sa dalle, avec ~10 mm de recouvrement à chaque
  // extrémité. Sans le lacet, le bras s'arrêtait à 5 cm de l'écran, dans le vide.
  {
    id: 'brasGauche',
    shape: 'cylinder',
    size: [0.03, 0.24, 0.03],
    position: [-0.4273, 0.42, -0.28],
    rotationDeg: [0, 27.2, 90],
    material: 'metalNoir',
    castShadow: true,
    receiveShadow: false,
    desktopOnly: true,
  },
  {
    id: 'brasCentre',
    shape: 'cylinder',
    size: [0.03, 0.375, 0.03],
    position: [-0.1547, 0.45, -0.3205],
    rotationDeg: [0, -3.1, 90],
    material: 'metalNoir',
    castShadow: true,
    receiveShadow: false,
    desktopOnly: true,
  },

  /* --- écran gauche (Expériences) ---------------------------------------- */
  {
    // Chanfrein volontairement plus court que sur le clavier : il mange la face avant
    // de 2 × 3 mm, et cette face noire est le porteur du contraste cliquable (§ 4).
    id: 'chassisGauche',
    shape: 'chamferBox',
    chamfer: 0.003,
    size: [0.32, 0.55, 0.022],
    position: [-0.52, 0.42, -0.22],
    rotationDeg: [0, 25, 0],
    material: 'chassis',
    castShadow: true,
    receiveShadow: true,
  },
  // Décalée de 13 mm le long de la normale du châssis (demi-épaisseur + 2 mm de garde),
  // sans quoi la dalle est coplanaire avec la face avant et disparaît derrière elle.
  {
    id: 'dalleGauche',
    shape: 'plane',
    size: [0.285, 0.505, 1],
    position: [-0.5145, 0.42, -0.2082],
    rotationDeg: [0, 25, 0],
    material: 'dalleGauche',
    castShadow: false,
    receiveShadow: false,
  },

  /* --- écran central (Projets) ------------------------------------------- */
  {
    id: 'chassisCentre',
    shape: 'chamferBox',
    chamfer: 0.003,
    size: [0.62, 0.375, 0.022],
    position: [0.02, 0.45, -0.3],
    rotationDeg: [0, -3, 0],
    material: 'chassis',
    castShadow: true,
    receiveShadow: true,
  },
  {
    id: 'dalleCentre',
    shape: 'plane',
    size: [0.59, 0.34, 1],
    position: [0.0193, 0.45, -0.287],
    rotationDeg: [0, -3, 0],
    material: 'dalleCentre',
    castShadow: false,
    receiveShadow: false,
  },

  /* --- portable (Compétences) -------------------------------------------- */
  {
    /*
     * Lacet ramené de −4° à 0°. Le portable est une cible de navigation, et la caméra
     * Compétences est posée sur la normale de sa dalle : avec 4° de lacet, cette normale
     * sort du plan x = 0,10, la caméra se retrouve à gauche de l'axe du portable, et la
     * base — plus proche — glisse de 28 % vers la droite par rapport au capot. Le portable
     * paraît alors disloqué. Un lacet ne sert ici ni la navigation ni la crédibilité.
     */
    id: 'portableBase',
    shape: 'chamferBox',
    chamfer: 0.005,
    size: [0.36, 0.02, 0.25],
    position: [0.1, 0.01, -0.1],
    rotationDeg: ZERO,
    material: 'chassis',
    castShadow: true,
    receiveShadow: true,
  },
  {
    /*
     * Le capot est articulé sur sa charnière, et sa position en découle. Le pivot est
     * son **arête arrière-basse**, et non le centre de sa face inférieure : posé sur ce
     * centre, le capot débordait de 5,8 mm derrière la face arrière de la base, et un
     * rayon rasant passait sous lui pour aller frapper le plateau — on voyait le bureau
     * à travers l'ordinateur. Le pivot est calé 2 mm en avant de cette face arrière.
     *
     *   pivot  = (0,100 / 0,020 / −0,223)   arête arrière-basse
     *   centre = pivot + normale × 6 mm + haut × 115 mm
     */
    id: 'portableCapot',
    shape: 'chamferBox',
    chamfer: 0.003,
    size: [0.36, 0.23, 0.012],
    position: [0.1, 0.1326, -0.247],
    rotationDeg: [-15, 0, 0],
    material: 'chassis',
    castShadow: true,
    receiveShadow: true,
  },
  {
    id: 'dallePortable',
    shape: 'plane',
    size: [0.335, 0.205, 1],
    position: [0.1, 0.1347, -0.2392],
    rotationDeg: [-15, 0, 0],
    material: 'dallePortable',
    castShadow: false,
    receiveShadow: false,
  },
  {
    // Pavé tactile : une plaque de 0,5 mm en creux. Sans lui, la moitié avant de la
    // base reste une surface vide et le portable ne se lit pas comme un portable.
    id: 'portablePave',
    shape: 'box',
    size: [0.1, 0.002, 0.062],
    position: [0.1, 0.0205, -0.0525],
    rotationDeg: ZERO,
    material: 'touches',
    castShadow: false,
    receiveShadow: true,
    desktopOnly: true,
  },

  /* --- périphériques ------------------------------------------------------ */
  {
    id: 'clavierCorps',
    shape: 'chamferBox',
    chamfer: 0.008,
    size: [0.44, 0.03, 0.15],
    position: [-0.02, 0.015, 0.165],
    rotationDeg: [0, -2, 0],
    material: 'plastiqueNoir',
    castShadow: true,
    receiveShadow: true,
  },
  // La plaque de touches pleine a été remplacée par un vrai champ de capuchons,
  // fusionné en une seule géométrie : cf. KEY_FIELDS plus bas.
  {
    // Demi-ellipsoïde : la moitié basse passe sous le plateau, qui est opaque, si bien
    // que seule la coque bombée de 38 mm reste visible. C'est le seul enfoncement
    // volontaire de la scène. En boîte, l'objet se lisait comme un cube posé là :
    // une souris n'est reconnaissable que par son galbe, pas par ses proportions.
    id: 'souris',
    shape: 'sphere',
    size: [0.065, 0.076, 0.11],
    position: [0.42, 0, 0.155],
    rotationDeg: [0, -8, 0],
    material: 'plastiqueNoir',
    castShadow: true,
    receiveShadow: false,
  },
  // Le casque a été retiré : cf. § 3.7 du dossier. Quatre écritures successives, aucune
  // lisible ; il ne servait ni la navigation ni la crédibilité de la scène.

  /* --- lampe -------------------------------------------------------------- */
  {
    id: 'lampeSocle',
    shape: 'cylinder',
    size: [0.12, 0.03, 0.12],
    position: [0.6, 0.015, -0.23],
    rotationDeg: ZERO,
    material: 'metalPoli',
    castShadow: true,
    receiveShadow: true,
    desktopOnly: true,
  },
  {
    id: 'lampeTige',
    shape: 'cylinder',
    size: [0.018, 0.39, 0.018],
    position: [0.6, 0.225, -0.23],
    rotationDeg: ZERO,
    material: 'metalPoli',
    castShadow: true,
    receiveShadow: false,
  },
  {
    id: 'lampeAbatJour',
    shape: 'sphere',
    size: [0.21, 0.21, 0.21],
    position: [0.57, 0.42, -0.205],
    rotationDeg: ZERO,
    material: 'abatJour',
    castShadow: true,
    receiveShadow: true,
  },

  /* --- siège (utile à la seule vue d'ensemble) ---------------------------- */
  {
    id: 'siegeAssise',
    shape: 'box',
    size: [0.48, 0.08, 0.46],
    position: [0, -0.3, 0.72],
    rotationDeg: ZERO,
    material: 'siege',
    castShadow: true,
    receiveShadow: true,
    desktopOnly: true,
  },
  {
    id: 'siegeDossier',
    shape: 'box',
    size: [0.46, 0.5, 0.06],
    position: [0, -0.01, 0.92],
    rotationDeg: [-8, 0, 0],
    material: 'siege',
    castShadow: true,
    receiveShadow: true,
    desktopOnly: true,
  },
]

/* --------------------------------------------------------- champs de touches */

/*
 * Un clavier complet compte 104 touches, un portable 76 : en meshes séparés, cela
 * ferait 180 draw calls pour un budget de 60. Chaque clavier est donc **fusionné
 * en une seule géométrie**, soit 2 draw calls au total.
 *
 * ⛔⛔ **Et non en `InstancedMesh`, comme ce commentaire l'affirmait — corrigé en
 * P5-05.** L'instanciation partage une géométrie et ne fait varier qu'une
 * matrice ; or le **fruit** du capuchon est une *longueur absolue*, si bien
 * qu'une barre d'espace de 6,25 u instanciée depuis un capuchon de 1 u en
 * hériterait un six fois trop large. Le dossier de scène le disait déjà, ce
 * fichier avait gardé la formulation antérieure, et le banc tranche :
 * `geometry.test.ts` mesure le retrait sur la plus large et la plus étroite des
 * touches — 1,2 mm dans les deux cas. La fusion coûte le **même** nombre de draw
 * calls ; sa mémoire est payée une fois au montage.
 *
 * Les plans sont
 * exprimés en unités clavier (1 u = le pas entre deux touches, 19 mm en taille
 * réelle, 17 mm en chiclet portable), puis convertis une seule fois au chargement
 * du module par `buildKeys`, qui est une fonction pure et testable sans WebGL.
 */

/** Une touche, dans le repère local de son champ, en mètres. */
export interface Key {
  /** Centre de la touche sur l'axe X local. */
  readonly x: number
  /** Centre de la touche sur l'axe Z local. */
  readonly z: number
  readonly width: number
  readonly depth: number
}

export interface KeyField {
  readonly id: string
  readonly material: MaterialId
  /** Centre du champ, au niveau de la surface qui le porte. */
  readonly position: Vec3
  readonly rotationDeg: Vec3
  /** Hauteur des capuchons au-dessus de cette surface. */
  readonly height: number
  /**
   * Retrait de la face supérieure sur chaque bord, en mètres. Un capuchon n'est pas
   * un cube : ses flancs sont légèrement rentrants, et c'est ce fruit — pas la
   * couleur — qui fait qu'une lumière rasante détache une touche de sa voisine.
   * Un tronc de pyramide coûte exactement autant qu'une boîte : 12 triangles.
   */
  readonly taper: number
  readonly keys: readonly Key[]
  readonly desktopOnly?: true
}

/** Une touche du plan : [colonne de départ en u, largeur en u]. */
type Slot = readonly [column: number, width: number]

interface RowPlan {
  /** Rang de la rangée depuis le fond, en u. Les fractions servent aux respirations. */
  readonly row: number
  /** Profondeur en u. Vaut 2 pour les touches hautes du pavé numérique. */
  readonly depth: number
  readonly slots: readonly Slot[]
}

/** Suite de `count` touches de `width` u à partir de la colonne `from`. */
function run(from: number, count: number, width = 1): readonly Slot[] {
  return Array.from({ length: count }, (_, i) => [from + i * width, width] as const)
}

/**
 * Convertit un plan en unités clavier en positions métriques centrées sur le champ.
 * `gap` est le jeu laissé entre deux capuchons voisins : c'est lui, et non la
 * couleur, qui rend la grille lisible à distance.
 */
function buildKeys(
  unit: number,
  gap: number,
  columns: number,
  rows: number,
  plan: readonly RowPlan[],
): readonly Key[] {
  const halfWidth = (columns * unit) / 2
  const halfDepth = (rows * unit) / 2
  const keys: Key[] = []
  for (const line of plan) {
    for (const [column, width] of line.slots) {
      keys.push({
        x: -halfWidth + (column + width / 2) * unit,
        z: -halfDepth + (line.row + line.depth / 2) * unit,
        width: width * unit - gap,
        depth: line.depth * unit - gap,
      })
    }
  }
  return keys
}

/* Clavier 104 touches ANSI : bloc principal 15 u, navigation à 15,25 u, pavé
 * numérique à 18,5 u, soit 22,5 u de large et 6,5 u de profond — ce qui redonne
 * bien les 0,4275 × 0,1235 m mesurés au § 2. */
const CLAVIER_PLAN: readonly RowPlan[] = [
  // Rangée des fonctions, détachée du reste par un demi-pas.
  {
    row: 0,
    depth: 1,
    slots: [[0, 1], ...run(2, 4), ...run(6.5, 4), ...run(11, 4), ...run(15.25, 3)],
  },
  { row: 1.5, depth: 1, slots: [...run(0, 13), [13, 2], ...run(15.25, 3), ...run(18.5, 4)] },
  {
    row: 2.5,
    depth: 1,
    slots: [[0, 1.5], ...run(1.5, 12), [13.5, 1.5], ...run(15.25, 3), ...run(18.5, 3)],
  },
  // Touche « + » du pavé, haute de deux rangées.
  { row: 2.5, depth: 2, slots: [[21.5, 1]] },
  { row: 3.5, depth: 1, slots: [[0, 1.75], ...run(1.75, 11), [12.75, 2.25], ...run(18.5, 3)] },
  {
    row: 4.5,
    depth: 1,
    slots: [[0, 2.25], ...run(2.25, 10), [12.25, 2.75], [16.25, 1], ...run(18.5, 3)],
  },
  // Entrée du pavé, haute de deux rangées.
  { row: 4.5, depth: 2, slots: [[21.5, 1]] },
  {
    row: 5.5,
    depth: 1,
    slots: [
      ...run(0, 3, 1.25),
      [3.75, 6.25],
      ...run(10, 4, 1.25),
      ...run(15.25, 3),
      [18.5, 2],
      [20.5, 1],
    ],
  },
]

/* Clavier du portable : 15 u × 6 u en chiclet, sans pavé numérique ni bloc de
 * navigation. Le pas reste à 19 mm — c'est celui des portables 14 pouces et plus ;
 * à 17 mm le champ ne faisait que 0,255 m sur une base de 0,36 et flottait au
 * milieu du repose-poignets. */
const PORTABLE_PLAN: readonly RowPlan[] = [
  { row: 0, depth: 1, slots: [[0, 1.25], ...run(1.25, 12), [13.25, 1.75]] },
  { row: 1, depth: 1, slots: [...run(0, 13), [13, 2]] },
  { row: 2, depth: 1, slots: [[0, 1.5], ...run(1.5, 12), [13.5, 1.5]] },
  { row: 3, depth: 1, slots: [[0, 1.75], ...run(1.75, 11), [12.75, 2.25]] },
  { row: 4, depth: 1, slots: [[0, 2.25], ...run(2.25, 10), [12.25, 2.75]] },
  { row: 5, depth: 1, slots: [...run(0, 4, 1.25), [5, 5.75], [10.75, 1.25], ...run(12, 3)] },
]

export const KEY_FIELDS: readonly KeyField[] = [
  {
    // Posé sur la face haute du corps du clavier (y = 0,030), même lacet que lui.
    id: 'clavierTouches',
    material: 'touches',
    position: [-0.02, 0.03, 0.165],
    rotationDeg: [0, -2, 0],
    height: 0.006,
    taper: 0.0012,
    keys: buildKeys(0.019, 0.0025, 22.5, 6.5, CLAVIER_PLAN),
    desktopOnly: true,
  },
  {
    // Posé sur la base du portable (y = 0,020), décalé vers la charnière.
    // Reculé de 4 mm avec le capot, pour garder 9,4 mm de bandeau franc sous lui.
    id: 'portableTouches',
    material: 'touches',
    position: [0.1, 0.02, -0.145],
    rotationDeg: ZERO,
    height: 0.003,
    taper: 0.0008,
    keys: buildKeys(0.019, 0.002, 15, 6, PORTABLE_PLAN),
    desktopOnly: true,
  },
]

/* --------------------------------------------------------------------- lumières */

/**
 * Lumière hémisphérique : ciel au-dessus, rebond du sol en dessous.
 *
 * Elle remplace l'ambiante uniforme, qui ajoutait la même valeur à toutes les faces
 * quelle que soit leur orientation — c'est-à-dire qui effaçait exactement ce que le
 * reste de l'éclairage cherche à créer. À coût strictement identique, l'hémisphérique
 * éclaire le dessus des objets d'une teinte froide et leur dessous du brun rebondi
 * par le plateau et le parquet. C'est le réglage le plus rentable de toute la scène.
 */
export interface HemisphereLightSpec {
  readonly kind: 'hemisphere'
  readonly skyColor: string
  readonly groundColor: string
  readonly intensity: number
}

export interface DirectionalLightSpec {
  readonly kind: 'directional'
  readonly color: string
  readonly intensity: number
  readonly position: Vec3
  readonly target: Vec3
  readonly castShadow: boolean
  /** Demi-étendue du frustum d'ombre, en mètres. */
  readonly shadowExtent: number
  readonly shadowMapSize: number
}

export interface PointLightSpec {
  readonly kind: 'point'
  readonly color: string
  readonly intensity: number
  readonly position: Vec3
  readonly distance: number
  /**
   * Exposant d'atténuation. Seul `2` correspond à l'inverse du carré de la
   * distance, donc au comportement physique. À expliciter : la valeur par défaut
   * de three a changé selon les versions.
   */
  readonly decay: number
}

export type LightSpec = HemisphereLightSpec | DirectionalLightSpec | PointLightSpec

export const LIGHTS: readonly LightSpec[] = [
  { kind: 'hemisphere', skyColor: '#C9D4E2', groundColor: '#9C7A50', intensity: 0.5 },
  {
    /*
     * `shadowExtent` est tombé de 2,00 à 1,00 m. La valeur de 2,00 n'était pas
     * choisie mais héritée d'une mesure faussée : elle englobait la plinthe, large de
     * 6 m, qui ne projette pourtant aucune ombre. En ne comptant que les objets qui
     * en projettent vraiment, le plus éloigné — le pied gauche du bureau — est à
     * 0,97 m. Le frustum couvre donc deux fois moins de terrain pour le même nombre
     * de texels : la résolution d'ombre passe de 3,9 à 2,0 mm par texel, sans rien
     * coûter. Avec la carte à 2048, on descend à 0,98 mm.
     */
    kind: 'directional',
    color: '#FFE7C4',
    intensity: 1.6,
    position: [-2.5, 2.6, 2.0],
    target: [0, 0, -0.2],
    castShadow: true,
    shadowExtent: 1.0,
    shadowMapSize: 2048,
  },
  /*
   * Corrigé après mesure dans `preview.html`. J'avais d'abord écrit 10, en
   * raisonnant par un facteur 4π sur l'ancienne valeur de 0,8 — raisonnement faux.
   * En unités physiques, ce n'est pas d'un facteur constant qu'il s'agit mais d'un
   * changement de loi : l'atténuation devient 1/d², et `decay` doit valoir 2. À
   * 0,37 m du clavier, 10 candelas donnent une irradiance de 73 contre 1,6 pour la
   * directionnelle — d'où la scène entièrement délavée au premier essai.
   *
   * Cette valeur et les trois autres intensités se règlent au curseur dans
   * `preview.html`, seul endroit où elles sont observables. Elles n'ont pas
   * d'équivalent dans Blender.
   */
  {
    kind: 'point',
    color: '#BFD4F5',
    intensity: 0.08,
    position: [0, 0.35, 0.05],
    distance: 1.6,
    decay: 2,
  },
]

/* ---------------------------------------------------------------------- caméras */

export type ViewId = 'accueil' | 'experiences' | 'projets' | 'competences'

export interface CameraSpec {
  readonly position: Vec3
  readonly target: Vec3
  /** Champ vertical en degrés, pour un rapport 16:9. */
  readonly fov: number
  /** Noeud d'écran mis en avant, absent pour la vue d'ensemble. */
  readonly focusNodeId?: string
}

/*
 * Les trois cadrages de gros plan sont posés **exactement sur la normale de leur
 * dalle**, et visent son centre. Ce n'est pas une élégance : une caméra à 4° hors
 * normale donne 9,6 % d'écart entre la marge gauche et la marge droite du cadre,
 * ce qui se lit immédiatement comme un écran mal centré. Position et cible sont donc
 * calculées, pas choisies — centre de la dalle ± normale × distance.
 */
export const CAMERAS: Readonly<Record<ViewId, CameraSpec>> = {
  accueil: { position: [0.05, 0.8, 1.6], target: [0, 0.2, -0.25], fov: 36 },
  experiences: {
    position: [-0.0961, 0.42, 0.6891],
    target: [-0.5145, 0.42, -0.2082],
    fov: 34,
    focusNodeId: 'dalleGauche',
  },
  projets: {
    position: [-0.0245, 0.45, 0.5491],
    target: [0.0193, 0.45, -0.287],
    fov: 36,
    focusNodeId: 'dalleCentre',
  },
  /*
   * Seul cadrage à ne pas être à 34–36°. À 0,61 m et 34°, la base du portable — profonde
   * de 0,25 m, donc bien plus proche de l'objectif que le capot — se projetait 63 % plus
   * large que lui : correct en géométrie, illisible à l'œil, le portable paraissait
   * emmanché de travers. Reculer à 0,95 m et resserrer à 16° ramène ce rapport à 75 % et,
   * surtout, sort les bords de la base du cadre. La dalle passe au passage de 51 % à 71 %
   * de la largeur d'image, ce qu'on attend d'un gros plan sur une cible de navigation.
   */
  competences: {
    position: [0.1, 0.3806, 0.6784],
    target: [0.1, 0.1347, -0.2392],
    fov: 16,
    focusNodeId: 'dallePortable',
  },
}

/** Durée de transition en millisecondes. Passer `true` pour prefers-reduced-motion. */
export const transitionMs = (reducedMotion: boolean): number => (reducedMotion ? 0 : 700)

export const LAYOUT = {
  materials: MATERIALS,
  nodes: NODES,
  keyFields: KEY_FIELDS,
  lights: LIGHTS,
  cameras: CAMERAS,
} as const
