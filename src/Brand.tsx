// The AnjunaTree brand lockup. Geometry is transcribed exactly from
// brand/brandmark/at-palm-fan.svg into ./brandGeometry, so this component and
// the rasterised favicon/PWA icons both draw the same numbers.
//
// Three gradients, one per part, each derived from the active theme's own
// tokens (see themes.ts `applyTheme`) so the mark re-colours with every theme
// automatically: the structure (axis + trunk) fades dim-to-solid ink, the
// canopy sweeps across all three label colours — it's the catalogue in
// miniature — and the fan runs from Anjunadeep into the theme's accent.
//
// The gradient stops are resolved and applied in JS (setAttribute), not via
// SVG `<stop style={{ stopColor: 'var(...)' }}>`. That combination — a CSS
// custom property inside an inline style on an SVG <stop> — is exactly the
// case WebKit doesn't reliably repaint: it was rendering the trunk and
// timeline as flat black in Safari, correct only in Chromium/Firefox. Reading
// the resolved custom-property values with getComputedStyle and setting
// `stop-color` as a plain attribute sidesteps the whole class of bug.

import { useEffect, useRef } from 'react'
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
}

let instanceCounter = 0

const VARS = {
  structure: ['--mark-structure-1', '--mark-structure-2'],
  canopy: ['--mark-canopy-1', '--mark-canopy-2', '--mark-canopy-3'],
  fan: ['--mark-fan-1', '--mark-fan-2'],
} as const

const FALLBACK: Record<string, string> = {
  '--mark-structure-1': '#898781',
  '--mark-structure-2': '#e6e8ee',
  '--mark-canopy-1': '#3987e5',
  '--mark-canopy-2': '#199e70',
  '--mark-canopy-3': '#d95926',
  '--mark-fan-1': '#199e70',
  '--mark-fan-2': '#3987e5',
}

export function TreeMark({ size = 26, className }: MarkProps) {
  const idRef = useRef(`tm${++instanceCounter}`)
  const uid = idRef.current
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    const sync = () => {
      const computed = getComputedStyle(document.documentElement)
      for (const group of Object.values(VARS)) {
        for (const name of group) {
          const stop = svg.querySelector(`stop[data-var="${name}"]`)
          if (!stop) continue
          const value = computed.getPropertyValue(name).trim() || FALLBACK[name]
          stop.setAttribute('stop-color', value)
        }
      }
    }

    sync()
    window.addEventListener('anjunatree:theme-changed', sync)
    return () => window.removeEventListener('anjunatree:theme-changed', sync)
  }, [])

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox={`0 0 ${ART_SIZE} ${ART_SIZE}`}
      fill="none"
      aria-hidden="true"
      className={className}
      focusable="false"
    >
      <defs>
        {/* userSpaceOnUse, not the objectBoundingBox default: the axis line is
            perfectly horizontal, so its own bounding box has zero height —
            and a vertical gradient's Y coordinates are undefined against a
            zero-height box per the SVG spec, which rendered it invisible in
            every browser. Fixed coordinates over the artwork's real Y range
            sidestep that entirely. */}
        <linearGradient
          id={`${uid}-structure`}
          gradientUnits="userSpaceOnUse"
          x1="256"
          y1="499"
          x2="256"
          y2="12"
        >
          <stop offset="0" data-var="--mark-structure-1" stopColor={FALLBACK['--mark-structure-1']} />
          <stop offset="1" data-var="--mark-structure-2" stopColor={FALLBACK['--mark-structure-2']} />
        </linearGradient>
        <linearGradient id={`${uid}-canopy`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" data-var="--mark-canopy-1" stopColor={FALLBACK['--mark-canopy-1']} />
          <stop offset="0.5" data-var="--mark-canopy-2" stopColor={FALLBACK['--mark-canopy-2']} />
          <stop offset="1" data-var="--mark-canopy-3" stopColor={FALLBACK['--mark-canopy-3']} />
        </linearGradient>
        <linearGradient id={`${uid}-fan`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" data-var="--mark-fan-1" stopColor={FALLBACK['--mark-fan-1']} />
          <stop offset="1" data-var="--mark-fan-2" stopColor={FALLBACK['--mark-fan-2']} />
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
