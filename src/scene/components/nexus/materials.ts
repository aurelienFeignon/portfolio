/**
 * Les matériaux de NEXUS — quelques shaders courts, et aucun post-traitement.
 *
 * ⭐⭐ **Le halo est obtenu sans bloom.** Un `EffectComposer` aurait ajouté une
 * dépendance, deux passes plein écran par image et un coût de compilation au
 * montage — précisément le poste que la mesure de référence désigne
 * (`performance-budget.md` §6.3). Ici, la lueur est **dans la géométrie** :
 * coques de Fresnel en mélange additif, points doux, lignes dont l'intensité
 * circule. Le résultat se lit comme une lumière émise, pour le prix d'un draw
 * call par objet.
 *
 * Tous partagent une horloge `uTime`, avancée par `useNexusClock` — et figée sous
 * `prefers-reduced-motion`.
 */
import { AdditiveBlending, Color, DoubleSide, ShaderMaterial } from 'three'

export interface TimeUniform {
  readonly uTime: { value: number }
}

/**
 * Une coque translucide qui ne s'éclaire qu'à sa silhouette : `1 − |n·v|` élevé à
 * une puissance. Le centre reste transparent, le bord rayonne.
 */
export function fresnelMaterial(color: string, intensity: number, power: number): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new Color(color) },
      uIntensity: { value: intensity },
      uPower: { value: power },
    },
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec4 world = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-world.xyz);
        gl_Position = projectionMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uIntensity;
      uniform float uPower;
      uniform float uTime;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float rim = pow(1.0 - abs(dot(vNormal, vView)), uPower);
        float pulse = 0.82 + 0.18 * sin(uTime * 0.55);
        gl_FragColor = vec4(uColor * rim * uIntensity * pulse, rim * uIntensity);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })
}

/**
 * Des points ronds et doux, qui scintillent lentement — chacun à sa phase.
 *
 * ⛔ La taille est **atténuée par la distance** : sans cela, une particule au
 * fond de la scène pèse autant qu'une au premier plan, et la profondeur s'aplatit.
 */
export function softPointsMaterial(
  colorA: string,
  colorB: string,
  size: number,
  pixelRatio: number,
): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColorA: { value: new Color(colorA) },
      uColorB: { value: new Color(colorB) },
      uSize: { value: size * pixelRatio },
      uHighlight: { value: 0 },
    },
    vertexShader: /* glsl */ `
      attribute float aPhase;
      uniform float uTime;
      uniform float uSize;
      varying float vTwinkle;
      varying float vMix;
      void main() {
        vec4 view = modelViewMatrix * vec4(position, 1.0);
        vTwinkle = 0.55 + 0.45 * sin(uTime * 0.7 + aPhase);
        vMix = fract(aPhase * 0.318);
        gl_PointSize = uSize * (0.75 + 0.25 * vTwinkle) / -view.z;
        gl_Position = projectionMatrix * view;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform float uHighlight;
      varying float vTwinkle;
      varying float vMix;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float alpha = smoothstep(0.5, 0.0, d);
        alpha *= alpha;
        vec3 color = mix(uColorA, uColorB, vMix);
        gl_FragColor = vec4(color, alpha * vTwinkle * (0.75 + 0.6 * uHighlight));
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })
}

/**
 * Une ligne parcourue par une impulsion lumineuse : l'attribut `aT` va de 0 à 1
 * le long de la ligne, et l'éclat suit `fract(uTime × vitesse)`.
 */
export function flowLineMaterial(
  colorA: string,
  colorB: string,
  opacity: number,
  speed: number,
): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColorA: { value: new Color(colorA) },
      uColorB: { value: new Color(colorB) },
      uOpacity: { value: opacity },
      uSpeed: { value: speed },
      uHighlight: { value: 0 },
    },
    vertexShader: /* glsl */ `
      attribute float aT;
      varying float vT;
      void main() {
        vT = aT;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform float uOpacity;
      uniform float uSpeed;
      uniform float uTime;
      uniform float uHighlight;
      varying float vT;
      void main() {
        float head = fract(uTime * uSpeed);
        float gap = abs(vT - head);
        float pulse = smoothstep(0.12, 0.0, min(gap, 1.0 - gap));
        vec3 color = mix(uColorA, uColorB, vT);
        float alpha = uOpacity * (0.35 + 0.65 * uHighlight) + pulse * 0.85;
        gl_FragColor = vec4(color * (1.0 + pulse), alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })
}

/**
 * Un faisceau en pointillés qui courent du noyau vers l'univers.
 *
 * ⭐ Le pas est fixé **en unités de scène**, pas en fraction du tracé : `aT` est
 * multiplié par la longueur de la ligne (`length`), donc un arc long et un arc
 * court portent des tirets de la même taille. Les deux extrémités s'effacent —
 * le faisceau naît du noyau et se perd dans l'univers, il ne s'y cogne pas.
 */
export function dashedBeamMaterial(color: string, opacity: number, length: number): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new Color(color) },
      uOpacity: { value: opacity },
      uLength: { value: length },
      uHighlight: { value: 0 },
    },
    vertexShader: /* glsl */ `
      attribute float aT;
      varying float vT;
      void main() {
        vT = aT;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uLength;
      uniform float uHighlight;
      uniform float uTime;
      varying float vT;
      void main() {
        // Un tiret toutes les 0,36 unité, qui avance de 0,2 unité par seconde.
        float phase = fract(vT * uLength / 0.36 - uTime * 0.55);
        float dash = smoothstep(0.0, 0.08, phase) * (1.0 - smoothstep(0.5, 0.58, phase));
        float ends = smoothstep(0.0, 0.08, vT) * (1.0 - smoothstep(0.9, 1.0, vT));
        float alpha = dash * ends * uOpacity * (0.6 + 0.4 * uHighlight);
        gl_FragColor = vec4(uColor * (1.0 + 0.7 * uHighlight), alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })
}

/**
 * Une colonne de lumière : opaque à sa base, évanouie à son sommet, plus claire
 * au bord qu'au centre — un faisceau, pas un cylindre.
 */
export function beamMaterial(color: string, intensity: number): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new Color(color) },
      uIntensity: { value: intensity },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vUv = uv;
        vec4 world = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-world.xyz);
        gl_Position = projectionMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uIntensity;
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float fade = pow(1.0 - vUv.y, 1.6);
        float rim = 0.35 + 0.65 * pow(1.0 - abs(dot(vNormal, vView)), 1.5);
        float shimmer = 0.85 + 0.15 * sin(uTime * 0.8 + vUv.y * 9.0);
        float alpha = fade * rim * shimmer * uIntensity;
        gl_FragColor = vec4(uColor * alpha, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    blending: AdditiveBlending,
  })
}
