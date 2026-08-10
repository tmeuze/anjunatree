// The AnjunaTree mark — concept 3c, "Palm fan" — as pure geometry.
//
// Five splayed fronds (the coconut palms of Anjuna beach, doubling as a signal
// fan) crown a canopy of release-dots standing on a timeline axis.
//
// This is the single source of truth: <TreeMark> in src/Brand.tsx draws it as
// SVG, and scripts/make-icons.ts rasterises the very same numbers for the
// favicon and PWA icons, so the two can never drift apart.
//
// The artboard is 100x100 and the artwork touches all four edges — no padding
// baked in. That's deliberate: it lets the header centre the mark against the
// wordmark with plain flexbox, because the box *is* the art.

export const ART_SIZE = 100

export const AXIS_STROKE = 1.6
export const TRUNK_STROKE = 2.6

export const AXIS_Y = 94.7
export const TICK_BOTTOM = 100
export const AXIS_LINE: [number, number, number, number] = [1.05, AXIS_Y, 99.4, AXIS_Y]
export const TICKS = [19.5, 34.6, 50, 65.3, 80.7]
export const TRUNK: [number, number, number, number] = [50, AXIS_Y, 50, 57.5]

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

/**
 * The fan. Angles are degrees from vertical; the outer fronds are a touch
 * shorter so the spray reads as a palm crown rather than a starburst, and the
 * bases are wide enough to overlap into a solid wedge where they meet.
 */
const FRONDS: { deg: number; length: number }[] = [
  { deg: -66, length: 28.4 },
  { deg: -34, length: 30.6 },
  { deg: 0, length: 31.2 },
  { deg: 34, length: 30.6 },
  { deg: 66, length: 28.4 },
]
export const FAN_ORIGIN: [number, number] = [50, 31.6]
const FROND_HALF_BASE = 2.5

/** Each frond as a triangle: wide where they meet, tapering to a point. */
export function frondTriangles(): [number, number][][] {
  const [ox, oy] = FAN_ORIGIN
  return FRONDS.map(({ deg, length }) => {
    const t = (deg * Math.PI) / 180
    const tip: [number, number] = [ox + Math.sin(t) * length, oy - Math.cos(t) * length]
    const px = Math.cos(t) * FROND_HALF_BASE
    const py = Math.sin(t) * FROND_HALF_BASE
    return [[ox + px, oy + py], tip, [ox - px, oy - py]]
  })
}

/** Small filled wedge below the convergence, so the fan meets the canopy cleanly. */
export const FAN_STEM: [number, number][] = [
  [FAN_ORIGIN[0] - 2.6, FAN_ORIGIN[1] - 1.4],
  [FAN_ORIGIN[0] + 2.6, FAN_ORIGIN[1] - 1.4],
  [FAN_ORIGIN[0], FAN_ORIGIN[1] + 4.2],
]

export const polygonPoints = (pts: [number, number][]): string =>
  pts.map(([x, y]) => `${x},${y}`).join(' ')
