import type { CatalogRelease } from './types'

export type Shape = 'circle' | 'triangle' | 'square' | 'diamond' | 'ring'

export const SHAPE_LABEL: Record<Shape, string> = {
  square: 'Studio album',
  diamond: 'Compilation / mix',
  ring: 'Remix package',
  triangle: 'EP',
  circle: 'Single',
}

export const SHAPE_ORDER: Shape[] = ['square', 'diamond', 'ring', 'triangle', 'circle']

export function shapeOf(rel: CatalogRelease): Shape {
  const sec = rel.secondaryTypes
  if (sec.includes('Compilation') || sec.includes('DJ-mix')) return 'diamond'
  if (sec.includes('Remix')) return 'ring'
  if (rel.type === 'Album') return 'square'
  if (rel.type === 'EP') return 'triangle'
  return 'circle'
}

/**
 * Trace a shape path centered on (x, y), area-matched to a circle of radius r
 * so different shapes read as the same visual weight. 'ring' traces a circle —
 * the caller strokes it instead of filling.
 */
export function traceShape(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  x: number,
  y: number,
  r: number,
): void {
  ctx.beginPath()
  switch (shape) {
    case 'circle':
    case 'ring':
      ctx.arc(x, y, r, 0, Math.PI * 2)
      break
    case 'square': {
      const half = r * 0.886
      ctx.rect(x - half, y - half, half * 2, half * 2)
      break
    }
    case 'triangle': {
      const s = r * 1.35
      ctx.moveTo(x, y - s)
      ctx.lineTo(x + s * 0.866, y + s * 0.5)
      ctx.lineTo(x - s * 0.866, y + s * 0.5)
      ctx.closePath()
      break
    }
    case 'diamond': {
      const s = r * 1.25
      ctx.moveTo(x, y - s)
      ctx.lineTo(x + s, y)
      ctx.lineTo(x, y + s)
      ctx.lineTo(x - s, y)
      ctx.closePath()
      break
    }
  }
}
