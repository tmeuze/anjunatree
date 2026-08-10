// The AnjunaTree brand — concept 3c, "Palm fan".
//
// Five splayed fronds (the coconut palms of Anjuna beach, doubling as a signal
// fan) crown a canopy of release-dots on a timeline axis: the same visual
// language the map itself uses.
//
// Two deliberate choices:
//
//  * Colours come from the theme, never fixed. The source art ships one variant
//    for light backgrounds and one for dark; neither survives a theme switch,
//    so the fronds take the label accent, the tree takes `currentColor`, and
//    the axis takes muted ink.
//  * The viewBox is the artwork's exact bounding box — content touches all four
//    edges, with no padding baked in. That's what lets the header centre the
//    mark against the wordmark with plain flexbox: any dead space inside the
//    viewBox would show up as an optical misalignment that no CSS could fix.
//
// scripts/make-icons.mjs redraws this same geometry for the favicon and PWA
// icons; keep the two in step.

/** Fan geometry, in the 100x100 artboard. Angles are degrees from vertical. */
const FROND_ANGLES = [-65, -35, 0, 35, 65]
const FAN_ORIGIN = { x: 50, y: 31.2 }
const FROND_LENGTH = 31.2
const FROND_HALF_BASE = 1.7

/** A frond is a narrow triangle from the fan's origin to its tip, so it tapers. */
export function frondPoints(deg: number): string {
  const t = (deg * Math.PI) / 180
  const { x, y } = FAN_ORIGIN
  const tipX = x + Math.sin(t) * FROND_LENGTH
  const tipY = y - Math.cos(t) * FROND_LENGTH
  const px = Math.cos(t) * FROND_HALF_BASE
  const py = Math.sin(t) * FROND_HALF_BASE
  return `${x + px},${y + py} ${tipX},${tipY} ${x - px},${y - py}`
}

/** Canopy dots: [cx, cy, r]. */
export const CANOPY: [number, number, number][] = [
  [21.9, 36.7, 2.4],
  [39.9, 36.7, 4.1],
  [60.3, 36.7, 3.4],
  [78.3, 36.7, 2.2],
  [32.2, 49.2, 2.9],
  [50.0, 49.2, 4.3],
  [68.0, 49.2, 3.1],
]

export const TRUNK = { x: 50, top: 57.5, bottom: 94.7 }
export const AXIS = { y: 94.7, left: 1.05, right: 99.4, tickBottom: 100 }
export const TICKS = [19.5, 34.6, 50, 65.3, 80.7]

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
      {/* the timeline the catalogue grows out of */}
      <g stroke="var(--ink-muted)" strokeWidth="1.6" strokeLinecap="round" opacity="0.8">
        <line x1={AXIS.left} y1={AXIS.y} x2={AXIS.right} y2={AXIS.y} />
        {TICKS.map((x) => (
          <line key={x} x1={x} y1={AXIS.y} x2={x} y2={AXIS.tickBottom} />
        ))}
      </g>

      {/* trunk and canopy inherit from whatever they sit in */}
      <line
        x1={TRUNK.x}
        y1={TRUNK.bottom}
        x2={TRUNK.x}
        y2={TRUNK.top}
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <g fill="currentColor">
        {CANOPY.map(([cx, cy, r]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
        ))}
      </g>

      {/* the palm fan */}
      <g fill="var(--label-anjunadeep)">
        {FROND_ANGLES.map((a) => (
          <polygon key={a} points={frondPoints(a)} />
        ))}
      </g>
    </svg>
  )
}

/**
 * The wordmark: Jost in small caps, "Tree" in bold. Live text rather than an
 * image, so it scales with the text-size setting and stays selectable and
 * readable to screen readers.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={`wordmark${className ? ` ${className}` : ''}`}>
      Anjuna<b>Tree</b>
    </span>
  )
}
