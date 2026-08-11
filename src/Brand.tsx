// The AnjunaTree brand lockup. Geometry lives in ./brandGeometry so the SVG
// here and the rasterised favicon/PWA icons are literally the same numbers.
//
// Colours come from the theme, never fixed: the fronds take the label accent,
// the tree takes `currentColor`, the axis takes muted ink. The supplied source
// art ships one variant for light backgrounds and one for dark, and neither
// survives a theme switch — this does.

import {
  AXIS_LINE,
  AXIS_STROKE,
  AXIS_Y,
  CANOPY,
  FROND_STROKE,
  TICKS,
  TICK_BOTTOM,
  TRUNK,
  TRUNK_STROKE,
  frondLines,
} from './brandGeometry'

const FRONDS = frondLines()

interface MarkProps {
  size?: number
  className?: string
}

export function TreeMark({ size = 26, className }: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
      className={className}
      focusable="false"
    >
      {/* the timeline the catalogue grows out of — short, and deliberately quiet */}
      <g stroke="var(--ink-muted)" strokeWidth={AXIS_STROKE} strokeLinecap="round" opacity="0.8">
        <line x1={AXIS_LINE[0]} y1={AXIS_LINE[1]} x2={AXIS_LINE[2]} y2={AXIS_LINE[3]} />
        {TICKS.map((x) => (
          <line key={x} x1={x} y1={AXIS_Y} x2={x} y2={TICK_BOTTOM} />
        ))}
      </g>

      {/* trunk and canopy inherit from whatever they sit in */}
      <line
        x1={TRUNK[0]}
        y1={TRUNK[1]}
        x2={TRUNK[2]}
        y2={TRUNK[3]}
        stroke="currentColor"
        strokeWidth={TRUNK_STROKE}
        strokeLinecap="round"
      />
      <g fill="currentColor">
        {CANOPY.map(([cx, cy, r]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
        ))}
      </g>

      {/* the palm fan — soft radiating strokes plus the horizontal spine */}
      <g
        stroke="var(--label-anjunadeep)"
        strokeWidth={FROND_STROKE}
        strokeLinecap="round"
      >
        {FRONDS.map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
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
