// The AnjunaTree mark — concept 3c, "Palm fan" — as pure geometry.
//
// Five splayed fronds (the coconut palms of Anjuna beach, doubling as a signal
// fan) over a small canopy of release-dots, on a short timeline axis.
//
// Proportions are deliberate: the fan is the widest and boldest element so the
// mark reads as a palm at any size, and the axis is short and quiet — present
// enough to say "timeline", never wide enough to compete. Five dots, three
// ticks, one trunk: few enough shapes to stay legible at favicon size.
//
// This is the single source of truth. <TreeMark> in src/Brand.tsx draws it as
// SVG and scripts/make-icons.ts rasterises the very same numbers, so the two
// can't drift apart.
//
// The artboard is 100x100 and the artwork touches all four edges — no padding
// baked in. That's what lets the header centre the mark against the wordmark
// with plain flexbox: the box *is* the art.

export const ART_SIZE = 100

export const AXIS_STROKE = 1.8
export const TRUNK_STROKE = 3

export const AXIS_Y = 92
export const TICK_BOTTOM = 100
export const AXIS_LINE: [number, number, number, number] = [31, AXIS_Y, 69, AXIS_Y]
export const TICKS = [38.5, 50, 61.5]
export const TRUNK: [number, number, number, number] = [50, AXIS_Y, 50, 73]

/** Canopy dots: [cx, cy, r]. */
export const CANOPY: [number, number, number][] = [
  [32, 57, 3],
  [50, 55.5, 4.2],
  [68, 57, 3],
  [41, 69, 3.2],
  [59, 69, 3.2],
]

/** The fan: degrees from vertical, and how far each frond reaches. */
const FRONDS: { deg: number; length: number }[] = [
  { deg: -75, length: 48 },
  { deg: -42, length: 46 },
  { deg: 0, length: 44 },
  { deg: 42, length: 46 },
  { deg: 75, length: 48 },
]
export const FAN_ORIGIN: [number, number] = [50, 44]
const FROND_HALF_BASE = 3

/** Each frond is a triangle: broad where they meet, tapering to a point. */
export function frondTriangles(): [number, number][][] {
  const [ox, oy] = FAN_ORIGIN
  return FRONDS.map(({ deg, length }) => {
    const t = (deg * Math.PI) / 180
    const tip: [number, number] = [ox + Math.sin(t) * length, oy - Math.cos(t) * length]
    const px = Math.cos(t) * FROND_HALF_BASE
    const py = Math.sin(t) * FROND_HALF_BASE
    return [
      [ox + px, oy + py],
      tip,
      [ox - px, oy - py],
    ]
  })
}

export const polygonPoints = (pts: [number, number][]): string =>
  pts.map(([x, y]) => `${round(x)},${round(y)}`).join(' ')

const round = (n: number) => Math.round(n * 100) / 100
