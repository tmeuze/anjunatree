// The AnjunaTree brand lockup. Geometry is transcribed exactly from
// brand/brandmark/at-palm-fan.svg into ./brandGeometry, so this component and
// the rasterised favicon/PWA icons both draw the same numbers.
//
// Three gradients, one per part, each derived from the active theme's own
// tokens (see themes.ts `applyTheme`) so the mark re-colours with every theme
// automatically: the structure (axis + trunk) fades dim-to-solid ink, the
// canopy sweeps across all three label colours — it's the catalogue in
// miniature — and the fan runs from Anjunadeep into the theme's accent.

import {
  AXIS_LINE,
  AXIS_STROKE,
  ART_SIZE,
  CANOPY,
  CROWN_DOT,
  FAN_ORIGIN,
  FAN_STROKE,
  FRONDS,
  TICKS,
  TRUNK,
  TRUNK_STROKE,
} from './brandGeometry'

interface MarkProps {
  size?: number
  className?: string
  /** Unique per rendered instance — SVG gradient ids are global to the document. */
  gradientId?: string
}

let instanceCounter = 0

export function TreeMark({ size = 26, className, gradientId }: MarkProps) {
  const uid = gradientId ?? `tm${++instanceCounter}`

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${ART_SIZE} ${ART_SIZE}`}
      fill="none"
      aria-hidden="true"
      className={className}
      focusable="false"
    >
      <defs>
        <linearGradient id={`${uid}-structure`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" style={{ stopColor: 'var(--mark-structure-1, #898781)' }} />
          <stop offset="1" style={{ stopColor: 'var(--mark-structure-2, #e6e8ee)' }} />
        </linearGradient>
        <linearGradient id={`${uid}-canopy`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style={{ stopColor: 'var(--mark-canopy-1, #3987e5)' }} />
          <stop offset="0.5" style={{ stopColor: 'var(--mark-canopy-2, #199e70)' }} />
          <stop offset="1" style={{ stopColor: 'var(--mark-canopy-3, #d95926)' }} />
        </linearGradient>
        <linearGradient id={`${uid}-fan`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" style={{ stopColor: 'var(--mark-fan-1, #199e70)' }} />
          <stop offset="1" style={{ stopColor: 'var(--mark-fan-2, #3987e5)' }} />
        </linearGradient>
      </defs>

      {/* trunk and timeline: one structure, one gradient, deliberately quiet */}
      <g
        stroke={`url(#${uid}-structure)`}
        strokeWidth={AXIS_STROKE}
        strokeLinecap="round"
        opacity="0.9"
      >
        <line x1={AXIS_LINE[0]} y1={AXIS_LINE[1]} x2={AXIS_LINE[2]} y2={AXIS_LINE[3]} />
        {TICKS.map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
        ))}
      </g>
      <line
        x1={TRUNK[0]}
        y1={TRUNK[1]}
        x2={TRUNK[2]}
        y2={TRUNK[3]}
        stroke={`url(#${uid}-structure)`}
        strokeWidth={TRUNK_STROKE}
        strokeLinecap="square"
      />

      {/* the canopy — the catalogue's three labels, swept into one gradient */}
      <g fill={`url(#${uid}-canopy)`}>
        {CANOPY.map(([cx, cy, r]) => (
          <circle key={`c${cx}-${cy}`} cx={cx} cy={cy} r={r} />
        ))}
        <circle cx={CROWN_DOT[0]} cy={CROWN_DOT[1]} r={CROWN_DOT[2]} />
      </g>

      {/* the palm fan */}
      <g stroke={`url(#${uid}-fan)`} strokeWidth={FAN_STROKE} strokeLinecap="round">
        {FRONDS.map(([x, y], i) => (
          <line key={i} x1={FAN_ORIGIN[0]} y1={FAN_ORIGIN[1]} x2={x} y2={y} />
        ))}
      </g>
    </svg>
  )
}

/**
 * The wordmark: Jost in small caps, "Tree" in bold. Live text rather than an
 * image, so it scales with the text-size setting and stays selectable.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={`wordmark${className ? ` ${className}` : ''}`}>
      Anjuna<b>Tree</b>
    </span>
  )
}
