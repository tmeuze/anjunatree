import { useMemo } from 'react'
import type { CatalogLayout } from './data'
import { SHAPE_LABEL, SHAPE_ORDER } from './shapes'
import type { Shape } from './shapes'
import type { MapNode } from './types'

interface Props {
  layout: CatalogLayout
  isActive: (n: MapNode) => boolean
}

function Glyph({ shape }: { shape: Shape }) {
  const c = 'currentColor'
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      {shape === 'circle' && <circle cx="8" cy="8" r="4.5" fill={c} />}
      {shape === 'ring' && <circle cx="8" cy="8" r="4.5" fill="none" stroke={c} strokeWidth="2.4" />}
      {shape === 'square' && <rect x="3.5" y="3.5" width="9" height="9" rx="1" fill={c} />}
      {shape === 'triangle' && <path d="M8 2.2 L14 13 L2 13 Z" fill={c} />}
      {shape === 'diamond' && <path d="M8 1.8 L14.2 8 L8 14.2 L1.8 8 Z" fill={c} />}
    </svg>
  )
}

export default function ShapeLegend({ layout, isActive }: Props) {
  // Only shapes present in the current filtered view appear, with live counts.
  const counts = useMemo(() => {
    const m = new Map<Shape, number>()
    for (const n of layout.nodes) {
      if (isActive(n)) m.set(n.shape, (m.get(n.shape) ?? 0) + 1)
    }
    return m
  }, [layout, isActive])

  const rows = SHAPE_ORDER.filter((s) => counts.has(s))

  return (
    <div className="shape-legend" aria-label="Release types in view">
      {rows.map((shape) => (
        <span key={shape} className="shape-legend-item">
          <Glyph shape={shape} />
          <span className="shape-legend-label">{SHAPE_LABEL[shape]}</span>
          <span className="shape-legend-count">{counts.get(shape)!.toLocaleString()}</span>
        </span>
      ))}
    </div>
  )
}
