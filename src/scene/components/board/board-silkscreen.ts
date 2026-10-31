/**
 * La sérigraphie peinte : UNE texture pour toute la carte (`carte-mere.md` §9), dessinée une
 * fois au montage dans un `<canvas>` 2D hors écran.
 *
 * Ce qui s'écrit et où vient de `board-render/silkscreen.ts` (pur, testé) ; ce module ne fait
 * que peindre. Par-dessous les textes et les cadres, le cuivre de fond — pistes fines et leurs
 * pastilles, à peine visibles — donne à la plaque le grain d'un vrai circuit imprimé.
 */
import { CanvasTexture, LinearMipmapLinearFilter, SRGBColorSpace } from 'three'

import type { BoardFile } from '@/scene/state/board-render/file-format'
import { hexToRgb } from '@/scene/state/board-render/geometry'
import {
  canvasMapping,
  fineTraces,
  silkscreenFrames,
  silkscreenItems,
} from '@/scene/state/board-render/silkscreen'
import type { Rect, Vec2 } from '@/scene/state/plane'
import { type DensityTier, PALETTE } from '@/scene/state/layout'

/** Résolution par palier, en pixels par unité de scène : un téléphone n'a pas la mémoire d'un poste. */
const PX_PER_UNIT: Readonly<Record<DensityTier, number>> = { full: 112, reduced: 80, lite: 64 }
/** Plafond de la plus grande dimension : la limite de texture courante, et 4096² × 4 octets ≈ 64 Mo. */
const MAX_TEXTURE = 4096
/** Nombre de pistes fines de fond par unité de surface, et leur graine (fixe : même carte à chaque visite). */
const FINE_PER_AREA = 0.42
const FINE_SEED = 0x51c0

const INK = 'rgba(214, 226, 244, 0.78)'
const INK_SOFT = 'rgba(214, 226, 244, 0.30)'
const COPPER = 'rgba(96, 156, 214, 0.1)'
const COPPER_PAD = 'rgba(201, 162, 87, 0.30)'

/** Une couleur `#RRGGBB` avec une opacité. */
const withAlpha = (hex: string, alpha: number): string => {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function paintSilkscreen(
  file: BoardFile,
  tier: DensityTier,
  passives: number,
  anisotropy: number,
): CanvasTexture {
  const { plan } = file
  const map = canvasMapping(plan.bounds, PX_PER_UNIT[tier], MAX_TEXTURE)
  const canvas = document.createElement('canvas')
  canvas.width = map.width
  canvas.height = map.height
  const g = canvas.getContext('2d')!
  const px = (v: number): number => v * map.scale
  const rect = (r: Rect): [number, number, number, number] => {
    const [x, y] = map.toPx([r.minX, r.minZ])
    return [x, y, px(r.maxX - r.minX), px(r.maxZ - r.minZ)]
  }
  const polyline = (points: readonly Vec2[]): void => {
    g.beginPath()
    points.forEach((p, i) => {
      const [x, y] = map.toPx(p)
      if (i === 0) g.moveTo(x, y)
      else g.lineTo(x, y)
    })
    g.stroke()
  }

  // Le cuivre de fond.
  const area = (plan.bounds.maxX - plan.bounds.minX) * (plan.bounds.maxZ - plan.bounds.minZ)
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.strokeStyle = COPPER
  g.lineWidth = px(0.05)
  const fine = fineTraces(plan, Math.round(area * FINE_PER_AREA), FINE_SEED)
  for (const line of fine) polyline(line)
  g.fillStyle = COPPER_PAD
  for (const line of fine) {
    for (const p of [line[0]!, line.at(-1)!]) {
      const [x, y] = map.toPx(p)
      g.beginPath()
      g.arc(x, y, px(0.055), 0, Math.PI * 2)
      g.fill()
    }
  }

  // Les cadres.
  for (const frame of silkscreenFrames(plan)) {
    const [x, y, w, h] = rect(frame.rect)
    switch (frame.kind) {
      case 'board': {
        // Le liseré : un trait franc, doublé d'un filet intérieur.
        g.strokeStyle = withAlpha(PALETTE.sky, 0.55)
        g.lineWidth = px(0.05)
        g.strokeRect(x, y, w, h)
        g.strokeStyle = withAlpha(PALETTE.sky, 0.18)
        g.lineWidth = px(0.02)
        g.strokeRect(x + px(0.16), y + px(0.16), w - px(0.32), h - px(0.32))
        break
      }
      case 'zone': {
        const tone = PALETTE[frame.tone ?? 'cyan']
        g.strokeStyle = withAlpha(tone, 0.22)
        g.lineWidth = px(0.03)
        g.setLineDash([px(0.16), px(0.1)])
        g.strokeRect(x, y, w, h)
        g.setLineDash([])
        // Les équerres des coins, pleines : le cadre se lit de loin.
        g.strokeStyle = withAlpha(tone, 0.75)
        g.lineWidth = px(0.055)
        const c = px(0.45)
        for (const [cx, cy, sx, sy] of [
          [x, y, 1, 1],
          [x + w, y, -1, 1],
          [x, y + h, 1, -1],
          [x + w, y + h, -1, -1],
        ] as const) {
          g.beginPath()
          g.moveTo(cx + sx * c, cy)
          g.lineTo(cx, cy)
          g.lineTo(cx, cy + sy * c)
          g.stroke()
        }
        break
      }
      case 'processor': {
        g.strokeStyle = INK_SOFT
        g.lineWidth = px(0.03)
        g.strokeRect(x, y, w, h)
        // Le repère de la broche 1 : un triangle plein au coin avant gauche.
        g.fillStyle = INK
        const t = px(0.22)
        g.beginPath()
        g.moveTo(x, y + h)
        g.lineTo(x + t, y + h)
        g.lineTo(x, y + h - t)
        g.closePath()
        g.fill()
        break
      }
      case 'chip': {
        g.strokeStyle = INK_SOFT
        g.lineWidth = px(0.018)
        g.strokeRect(x, y, w, h)
        break
      }
    }
  }

  // Les textes : années, repères, référence de la carte.
  g.fillStyle = INK
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  for (const item of silkscreenItems(file, passives)) {
    g.font = `600 ${px(item.size * 1.3)}px ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace`
    const [x, y] = map.toPx(item.at)
    g.fillText(item.text, x, y)
  }

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = anisotropy
  texture.minFilter = LinearMipmapLinearFilter
  /*
   * ⭐ Une fois envoyée au GPU, la texture n'a plus besoin de son image : le canvas est ramené à
   * 0 × 0, ce qui rend son tampon de pixels — jusqu'à 4096² × 4 octets ≈ 64 Mo au palier `full`.
   * Sûr parce que rien ne la renvoie : elle ne change plus (aucun `needsUpdate` après celui de la
   * construction), une carte disposée est masquée avant son `dispose` et jamais redessinée
   * (`useBoard`), et une perte de contexte fait tomber la scène plutôt que de la restaurer.
   */
  texture.onUpdate = () => {
    canvas.width = 0
    canvas.height = 0
  }
  return texture
}
