// The AnjunaTree brand lockup. Geometry lives in ./brandGeometry so the SVG
// here and the rasterised favicon/PWA icons are literally the same numbers.
//
// Colours come from the theme, never fixed: the canopy takes `currentColor`,
// the fan takes the label accent, and trunk + timeline share the muted ink so
// the structure recedes behind the dots. The supplied source art ships one
// variant for light backgrounds and one for dark, and neither survives a theme
// switch — this does.

import {
  AXIS_LINE,
  AXIS_Y,
  CANOPY,
  STRUCTURE_STROKE,
  TICKS,
  TICK_BOTTOM,
  TRUNK,
  fanDots,
} from './brandGeometry'

const FAN = fanDots()

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
      {/* trunk and timeline: one structure, one colour, deliberately quiet */}
      <g
        stroke="var(--ink-muted)"
        strokeWidth={STRUCTURE_STROKE}
        strokeLinecap="round"
        opacity="0.85"
      >
        <line x1={AXIS_LINE[0]} y1={AXIS_LINE[1]} x2={AXIS_LINE[2]} y2={AXIS_LINE[3]} />
        {TICKS.map((x) => (
          <line key={x} x1={x} y1={AXIS_Y} x2={x} y2={TICK_BOTTOM} />
        ))}
        <line x1={TRUNK[0]} y1={TRUNK[1]} x2={TRUNK[2]} y2={TRUNK[3]} />
      </g>

      {/* the canopy */}
      <g fill="currentColor">
        {CANOPY.map(([cx, cy, r]) => (
          <circle key={`c${cx}-${cy}`} cx={cx} cy={cy} r={r} />
        ))}
      </g>

      {/* the palm fan, made of the same dots */}
      <g fill="var(--label-anjunadeep)">
        {FAN.map(([cx, cy, r], i) => (
          <circle key={`f${i}`} cx={cx} cy={cy} r={r} />
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
