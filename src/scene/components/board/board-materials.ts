/**
 * Les matériaux de la carte mère — dans l'esprit de NEXUS : la lueur est **dans la géométrie**
 * (rubans à cœur et halo, carrés de lueur en mélange additif), aucun post-traitement.
 *
 * ⭐ Un matériau par **forme**, jamais par élément : les teintes passent par des attributs
 * (`aColor` des rubans, `instanceColor` des formes instanciées). C'est ce qui tient le budget de
 * §9 — et ce qui permettra au survol (P8-15f) d'agir par attribut, sans un matériau par piste.
 *
 * ⭐ Les shaders maison finissent par `tonemapping_fragment` et `colorspace_fragment`, comme
 * ceux de three : les teintes du plan sont des couleurs **linéaires** (`hexToLinear`), et la
 * sortie doit être convertie comme celle des matériaux standard voisins — sinon les pistes
 * paraîtraient d'une autre palette que les puces.
 */
import {
  AdditiveBlending,
  Color,
  type IUniform,
  MeshBasicMaterial,
  MeshStandardMaterial,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
} from 'three'

/** Ce que la scène fait avancer à chaque image. */
export interface BoardUniforms {
  readonly uTime: IUniform<number>
  readonly uIntensity: IUniform<number>
}

/**
 * Le brouillard **retranche** la lumière au lieu d'y ajouter sa couleur : en mélange additif, le
 * mélange standard vers `fogColor` allumerait les pistes du fond au lieu de les éteindre.
 */
const FOG_FADE = /* glsl */ `
  #ifdef USE_FOG
    gl_FragColor.rgb *= 1.0 - smoothstep(fogNear, fogFar, vFogDepth);
  #endif
`

/**
 * Le ruban d'une piste ou d'un fil du bus : un **cœur** net (`|across|` petit) et un **halo**
 * qui s'éteint vers les bords — une piste qui émet, pas un trait plat. Un fil éteint (`aIdle`)
 * prend le gris d'une piste morte, sans halo. `aLevel` porte l'état de survol de chaque sommet
 * (`relations.ts`) : la mise en relief d'une piste ne demande pas un matériau de plus.
 */
export function ribbonMaterial(options: {
  readonly core: number
  readonly halo: number
  readonly idleColor: string
}): ShaderMaterial & { uniforms: BoardUniforms } {
  const material = new ShaderMaterial({
    uniforms: UniformsUtils.merge([
      UniformsLib.fog,
      {
        uTime: { value: 0 },
        uIntensity: { value: 1 },
        uCore: { value: options.core },
        uHalo: { value: options.halo },
        uIdleColor: { value: new Color(options.idleColor) },
      },
    ]),
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>
      attribute vec3 aColor;
      attribute float aAcross;
      attribute float aAlong;
      attribute float aIdle;
      attribute float aLevel;
      varying vec3 vColor;
      varying float vAcross;
      varying float vAlong;
      varying float vIdle;
      varying float vLevel;
      void main() {
        vColor = aColor;
        vAcross = aAcross;
        vAlong = aAlong;
        vIdle = aIdle;
        vLevel = aLevel;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      #include <fog_pars_fragment>
      uniform float uTime;
      uniform float uIntensity;
      uniform float uCore;
      uniform float uHalo;
      uniform vec3 uIdleColor;
      varying vec3 vColor;
      varying float vAcross;
      varying float vAlong;
      varying float vIdle;
      varying float vLevel;
      void main() {
        float d = abs(vAcross);
        // Le cuivre de la piste, un filament plus vif en son milieu, un halo qui s'éteint au bord.
        float body = 1.0 - smoothstep(uCore - 0.06, uCore + 0.04, d);
        float filament = 1.0 - smoothstep(0.0, uCore * 0.5, d);
        float halo = pow(1.0 - d, 2.5) * uHalo;
        // Un frémissement lent le long de la piste : du cuivre sous tension, pas une impulsion.
        float shimmer = 0.9 + 0.1 * sin(vAlong * 2.3 - uTime * 0.9);
        vec3 lit = vColor * (body * 0.42 + filament * 0.85 + halo) * shimmer;
        vec3 idle = uIdleColor * body * 0.55;
        // ⭐ Le niveau de survol (P8-15f) : allumé, neutre ou atténué, par sommet (attribut aLevel).
        gl_FragColor = vec4(mix(lit, idle, vIdle) * uIntensity * vLevel, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        ${FOG_FADE}
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    fog: true,
  })
  return material as ShaderMaterial & { uniforms: BoardUniforms }
}

/**
 * Les carrés de lueur, instanciés : un dégradé radial à la teinte de l'instance, posé à plat —
 * le halo d'une diode, d'un processeur, d'un jalon. Le carré unité porte ses `uv`.
 */
export function glowMaterial(): ShaderMaterial & { uniforms: BoardUniforms } {
  const material = new ShaderMaterial({
    uniforms: UniformsUtils.merge([
      UniformsLib.fog,
      { uTime: { value: 0 }, uIntensity: { value: 1 } },
    ]),
    vertexShader: /* glsl */ `
      #include <fog_pars_vertex>
      varying vec2 vUv;
      varying vec3 vTint;
      void main() {
        vUv = uv;
        vTint = instanceColor;
        vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      #include <fog_pars_fragment>
      uniform float uTime;
      uniform float uIntensity;
      varying vec2 vUv;
      varying vec3 vTint;
      void main() {
        float d = clamp(length(vUv - 0.5) * 2.0, 0.0, 1.0);
        float glow = pow(1.0 - d, 2.4);
        float breathe = 0.88 + 0.12 * sin(uTime * 0.8);
        gl_FragColor = vec4(vTint * glow * uIntensity * breathe, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        ${FOG_FADE}
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    fog: true,
  })
  return material as ShaderMaterial & { uniforms: BoardUniforms }
}

/**
 * Retouche un `MeshStandardMaterial` (`onBeforeCompile`) pour qu'il connaisse, au fragment, la
 * position **locale** du sommet dans la boîte unité (`vLocal`) et la taille de l'instance
 * (`vSize`, les longueurs des colonnes de `instanceMatrix`) — de quoi dessiner liserés, gorges
 * et reflets en unités de scène, quelle que soit la taille du boîtier.
 *
 * ⭐ Plutôt qu'un shader complet : l'éclairage, le brouillard et la conversion de couleur de
 * three restent les siens. `surface` s'exécute avant l'éclairage — il peut toucher
 * `diffuseColor` et `totalEmissiveRadiance`.
 */
function withLocalFrame(
  name: string,
  material: MeshStandardMaterial,
  uniforms: Record<string, IUniform>,
  surface: string,
  options: { readonly keepInstanceColor: boolean },
): void {
  const declarations = Object.entries(uniforms)
    .map(([name, u]) => `uniform ${u.value instanceof Color ? 'vec3' : 'float'} ${name};`)
    .join('\n')
  /*
   * ⛔⛔ Une clé de programme PAR APPELANT : par défaut, three range les programmes sous
   * `onBeforeCompile.toString()` — le même texte pour toutes les retouches de cette fonction.
   * Sans cette clé, les condensateurs étaient rendus avec le programme des capots.
   */
  material.customProgramCacheKey = () => `board:${name}`
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLocal;\nvarying vec3 vSize;')
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `#include <begin_vertex>
        vLocal = position;
        vSize = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));`,
      )
    let fragment = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>\nvarying vec3 vLocal;\nvarying vec3 vSize;\n${declarations}`,
    )
    // Le corps garde SA couleur quand la teinte d'instance ne sert qu'à l'émission.
    if (!options.keepInstanceColor) fragment = fragment.replace('#include <color_fragment>', '')
    shader.fragmentShader = fragment.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>\n{\n${surface}\n}`,
    )
  }
}

/** Ce que les coordonnées locales donnent, communes aux boîtiers (en unités de scène). */
const LOCAL_FRAME = /* glsl */ `
  float top = step(0.499, vLocal.y);
  // Distance au bord du dessus, et à l'arête haute des flancs.
  float edge = min((0.5 - abs(vLocal.x)) * vSize.x, (0.5 - abs(vLocal.z)) * vSize.z);
  float fromTop = (0.5 - vLocal.y) * vSize.y;
`

/**
 * Le boîtier d'une puce : époxy noir mat, **liseré à la teinte de sa famille** le long des arêtes
 * du dessus — la teinte vient d'`instanceColor`, elle n'assombrit pas le corps. Un voile de
 * teinte, à peine, sur le dessus : la puce se lit comme de sa famille, même de loin.
 */
export function chipBodyMaterial(): MeshStandardMaterial & { userData: { rim: IUniform<number> } } {
  const material = new MeshStandardMaterial({ color: '#0E1118', roughness: 0.62, metalness: 0.15 })
  const rim: IUniform<number> = { value: 1 }
  material.userData['rim'] = rim
  withLocalFrame(
    'chip',
    material,
    { uRim: rim },
    /* glsl */ `${LOCAL_FRAME}
    float rimTop = top * (1.0 - smoothstep(0.014, 0.034, edge));
    float rimSide = (1.0 - top) * (1.0 - smoothstep(0.0, 0.025, fromTop));
    totalEmissiveRadiance += vColor.rgb * ((rimTop + rimSide * 0.5) * 1.5 + top * 0.012) * uRim;`,
    { keepInstanceColor: false },
  )
  return material as MeshStandardMaterial & { userData: { rim: IUniform<number> } }
}

/**
 * Le capot métallique d'un processeur : aluminium brossé — un reflet en biais, une gorge gravée
 * à distance du bord, et une arête qui rougeoie de violet, avivée quand la vue est celle des
 * projets (`uGlow`).
 */
export function lidMaterial(): MeshStandardMaterial & { userData: { glow: IUniform<number> } } {
  const material = new MeshStandardMaterial({ color: '#7A8494', roughness: 0.46, metalness: 0.55 })
  const glow: IUniform<number> = { value: 1 }
  material.userData['glow'] = glow
  withLocalFrame(
    'lid',
    material,
    { uGlow: glow, uGlowColor: { value: new Color('#8973F5') } },
    /* glsl */ `${LOCAL_FRAME}
    float groove = top * (1.0 - smoothstep(0.004, 0.016, abs(edge - 0.11)));
    diffuseColor.rgb *= 1.0 - groove * 0.65;
    // Le brossé : un reflet en biais, plus clair vers l'avant gauche (la lumière principale).
    float sheen = top * clamp(0.5 - 0.6 * (vLocal.x - vLocal.z), 0.0, 1.0);
    totalEmissiveRadiance += vec3(0.05, 0.055, 0.07) * sheen;
    float arete = 1.0 - smoothstep(0.0, 0.03, top > 0.5 ? edge : fromTop);
    totalEmissiveRadiance += uGlowColor * arete * 0.55 * uGlow;`,
    // La teinte d'instance (blanc au repos) porte le niveau de survol : le capot s'éclaircit
    // ou s'assombrit avec son processeur (P8-15f).
    { keepInstanceColor: true },
  )
  return material as MeshStandardMaterial & { userData: { glow: IUniform<number> } }
}

/**
 * Un condensateur chimique vu d'en haut : le dessus d'aluminium et sa croix d'évent, la gaine
 * sombre et sa bande de polarité — ce qui fait qu'on le reconnaît sans être du métier.
 */
export function capacitorMaterial(): MeshStandardMaterial {
  const material = new MeshStandardMaterial({ color: '#1F2A44', roughness: 0.4, metalness: 0.3 })
  withLocalFrame(
    'capacitor',
    material,
    {},
    /* glsl */ `${LOCAL_FRAME}
    float vent = top * (1.0 - smoothstep(0.02, 0.05, min(abs(vLocal.x), abs(vLocal.z))));
    vec3 aluminium = vec3(0.42, 0.45, 0.5) * (1.0 - vent * 0.55);
    float stripe = (1.0 - top) * step(0.32, -vLocal.x);
    diffuseColor.rgb = mix(mix(diffuseColor.rgb, vec3(0.5, 0.55, 0.62), stripe), aluminium, top);`,
    { keepInstanceColor: false },
  )
  return material
}

/** Le cuivre doré des broches, pastilles, vias et trous : un métal tiède qui accroche la lumière. */
export const goldMaterial = (): MeshStandardMaterial =>
  new MeshStandardMaterial({ color: '#C9A257', roughness: 0.36, metalness: 0.55 })

/** L'étain des terminaisons des résistances : un gris clair, sans éclat de miroir. */
export const tinMaterial = (): MeshStandardMaterial =>
  new MeshStandardMaterial({ color: '#8C96A3', roughness: 0.45, metalness: 0.5 })

/** Le substrat d'un processeur, le corps d'un petit composant : sombres, presque mats. */
export const darkBodyMaterial = (color: string, roughness = 0.6): MeshStandardMaterial =>
  new MeshStandardMaterial({ color, roughness, metalness: 0.15 })

/**
 * Ce qui émet sans être éclairé — diodes, jalons : la teinte d'instance telle quelle, hors de
 * l'adaptation de tons (une diode ne se ternit pas).
 */
export const emitterMaterial = (): MeshBasicMaterial =>
  new MeshBasicMaterial({ color: '#FFFFFF', toneMapped: false })
