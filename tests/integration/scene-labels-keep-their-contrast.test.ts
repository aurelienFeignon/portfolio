/**
 * P8-08 — les étiquettes de la carte mère restent lisibles quoi que la scène rende derrière.
 *
 * ⭐⭐ **Les étiquettes sont le seul texte posé sur la scène** (ADR-0004, `carte-mere.md` §9) : une
 * vitre semi-opaque, et l'étiquette entière à opacité réduite quand elle est visible. Le texte se
 * compose donc avec ce qui passe derrière, et son contraste n'a pas *une* valeur : il en a une par
 * pixel de scène.
 *
 * ⛔⛔ **Le pire cas est le BLANC, et il est atteignable.** Halos, impulsions et pistes se composent
 * en mélange additif (`board-materials.ts`) : là où plusieurs se superposent, les canaux saturent.
 * Et l'ancre d'une étiquette est précisément un composant, avec son halo. Borner sur le blanc rend
 * la mesure indépendante de l'éclairage (P8-05) et du contenu — un plafond, pas un relevé.
 *
 * Rien n'est recopié de la feuille de style : vitre, opacités et couleurs de texte sont LUES dans
 * `scene-mount.module.css` (toutes ses règles hors `.decor`, le canvas), les valeurs dans
 * `globals.css`. ⛔ **Une déclaration que ce banc ne sait pas lire le fait échouer**, jamais passer :
 * une opacité en pourcentage ou en `var()`, une couleur hors token (`var(--tone)`, un littéral), une
 * vitre d'une autre forme. Le pire cas retenu est le plus défavorable de chaque axe — la vitre la
 * plus claire, l'opacité visible la plus basse —, le conteneur `.etiquettes` multipliant la sienne.
 *
 * ⚠️ **Ce qu'il ne voit pas** : le fondu d'apparition (300 ms, de 0 à l'opacité visible) traverse
 * des contrastes plus bas — un état de transition, pas un état de lecture. Et la pastille de teinte
 * (`.nom::before`) n'est pas du texte : elle double le nom, d'où son exclusion.
 */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { hexToRgb } from '@/scene/state/board-render/geometry'
import { PALETTE, TONES } from '@/scene/state/layout'

/** WCAG 2.2, 1.4.3 (AA) : le texte des étiquettes est petit (`--text-sm`, 0,75 rem pour un repère). */
const AA_TEXT = 4.5

type Rgb = readonly [number, number, number]

/** sRGB, de 0 à 1 : l'espace où le navigateur compose les couches. */
function rgb(hex: string): Rgb {
  const [r, g, b] = hexToRgb(hex)
  return [r / 255, g / 255, b / 255]
}

/**
 * Luminance relative (WCAG). ⚠️ Sur une couleur déjà COMPOSÉE, donc pas `hexToLinear`, qui ne lit
 * qu'une teinte hexadécimale : le navigateur mélange en sRGB, puis seulement on linéarise.
 */
function luminance([r, g, b]: Rgb): number {
  const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

/** `front` à l'opacité `alpha` sur `back`. */
function over([r, g, b]: Rgb, alpha: number, [br, bg, bb]: Rgb): Rgb {
  const mix = (c: number, d: number) => c * alpha + d * (1 - alpha)
  return [mix(r, br), mix(g, bg), mix(b, bb)]
}

/**
 * Le contraste d'un texte d'étiquette sur un pixel de scène : la vitre (fond à `glass`) puis
 * l'étiquette entière (texte et vitre) à `opacity`, toutes deux sur `backdrop`.
 */
function labelContrast(text: Rgb, background: Rgb, glass: number, opacity: number, backdrop: Rgb) {
  const pane = over(over(background, glass, backdrop), opacity, backdrop)
  return contrast(over(text, opacity, backdrop), pane)
}

const root = process.cwd()
const TOKENS = new Map(
  [
    ...(await readFile(join(root, 'src/app/globals.css'), 'utf8')).matchAll(
      /--color-([\w-]+):\s*(#[0-9a-f]{6})\b/gi,
    ),
  ].map(([, name, value]) => [name!, value!]),
)

function token(name: string): Rgb {
  const hex = TOKENS.get(name)
  if (!hex) throw new Error(`--color-${name} absent de globals.css`)
  return rgb(hex)
}

const LABEL_CSS = await readFile(join(root, 'src/scene/components/scene-mount.module.css'), 'utf8')
/** Les règles de la feuille hors `.decor`, la couche du canvas : c'est là que vivent les étiquettes. */
const LABEL_RULES = [
  ...LABEL_CSS.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g),
]
  .map(([, selector, body]) => ({ selector: selector!.trim(), body: body! }))
  .filter(({ selector }) => !selector.startsWith('.decor'))

/** Chaque déclaration `prop:` des étiquettes, sélecteur compris. */
function declarations(prop: string): { selector: string; value: string }[] {
  return LABEL_RULES.flatMap(({ selector, body }) =>
    [...body.matchAll(new RegExp(`(?:^|[;\\s])${prop}:\\s*([^;]+)`, 'g'))].map(([, value]) => ({
      selector,
      value: value!.trim(),
    })),
  )
}

function unreadable(prop: string, { selector, value }: { selector: string; value: string }): never {
  throw new Error(`${selector} { ${prop}: ${value} } : forme illisible pour le garde de P8-08`)
}

function readLabelStyle() {
  // 0 est l'étiquette cachée : on juge l'opacité la plus basse à laquelle elle se LIT.
  const opacities = declarations('opacity')
    .map((d) => {
      const n = Number(d.value)
      return {
        onContainer: d.selector.startsWith('.etiquettes'),
        n: /^\d*\.?\d+$/.test(d.value) && n <= 1 ? n : unreadable('opacity', d),
      }
    })
    .filter(({ n }) => n > 0)
  const lowest = (onContainer: boolean) =>
    Math.min(1, ...opacities.filter((o) => o.onContainer === onContainer).map(({ n }) => n))

  const glasses = declarations('background')
    .filter((d) => !d.selector.includes('::before'))
    .map((d) => {
      const m = d.value.match(
        /^color-mix\(in srgb, var\(--color-([\w-]+)\) (\d+(?:\.\d+)?)%, transparent\)$/,
      )
      return m ? { background: m[1]!, glass: Number(m[2]) / 100 } : unreadable('background', d)
    })
  if (glasses.length === 0) throw new Error('aucune vitre lue dans scene-mount.module.css')
  const clearest = glasses.reduce((a, b) => (b.glass < a.glass ? b : a))

  const textTokens = [
    ...new Set(
      declarations('color').map(
        (d) => d.value.match(/^var\(--color-([\w-]+)\)$/)?.[1] ?? unreadable('color', d),
      ),
    ),
  ]

  return { ...clearest, opacity: lowest(true) * lowest(false), textTokens }
}

const STYLE = readLabelStyle()
/** Le blanc, borne de la saturation additive, et chaque teinte que la carte émet. */
const BACKDROPS: Record<string, string> = {
  white: '#FFFFFF',
  ...Object.fromEntries(TONES.map((tone) => [tone, PALETTE[tone]])),
}

describe('P8-08 — contraste des étiquettes de la carte sur la scène', () => {
  it('témoin : la formule retrouve les rapports notés dans globals.css', () => {
    expect(contrast(token('text'), token('background')).toFixed(1)).toBe('17.8')
    expect(contrast(token('text-muted'), token('background')).toFixed(1)).toBe('8.8')
  })

  it('témoin : l’étiquette de #86 (vitre 80 %, opacité 0,9) est vue en défaut sur le blanc', () => {
    expect(
      labelContrast(token('text-muted'), token('background'), 0.8, 0.9, rgb('#FFFFFF')),
    ).toBeLessThan(AA_TEXT)
  })

  it('la feuille porte au moins le nom et l’accroche', () => {
    expect(STYLE.textTokens).toEqual(expect.arrayContaining(['text', 'text-muted']))
  })

  it.each(Object.entries(BACKDROPS))('chaque texte d’étiquette tient AA sur %s', (_, hex) => {
    const { background, glass, opacity, textTokens } = STYLE
    for (const name of textTokens) {
      const ratio = labelContrast(token(name), token(background), glass, opacity, rgb(hex))
      expect(ratio, `--color-${name} sur ${hex}`).toBeGreaterThanOrEqual(AA_TEXT)
    }
  })
})
