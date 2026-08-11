// The AnjunaTree mark — concept 3c, "Palm fan" — as pure geometry.
//
// Everything above the ground is dots. Seven release-dots make the canopy, and
// the palm fan above it is drawn as dots too, running out along each frond so
// the crown reads as part of the same constellation rather than a different
// kind of drawing pasted on top. It is the map in miniature.
//
// The fan spans a full 180° — the coconut palms of Anjuna beach, and a rave
// hand fan — but stays smaller than the tree it crowns.
//
// Trunk and timeline share one muted colour, so the structure recedes and the
// dots carry the mark.
//
// This is the single source of truth. <TreeMark> in src/Brand.tsx draws it as
// SVG and scripts/make-icons.ts rasterises the very same numbers, so the two
// can't drift apart.
//
// The artboard is 100x100. Content spans the full height and is symmetric
// about x = 50, which is what lets the header centre the mark against the
// wordmark with plain flexbox.

export const ART_SIZE = 100

export const STRUCTURE_STROKE = 1.8

export const AXIS_Y = 92
export const TICK_BOTTOM = 100
export const AXIS_LINE: [number, number, number, number] = [31, AXIS_Y, 69, AXIS_Y]
export const TICKS = [38.5, 50, 61.5]
/** Drawn in the axis colour, not the canopy's — trunk and timeline are one. */
export const TRUNK: [number, number, number, number] = [50, AXIS_Y, 50, 57]

/** The canopy — release-dots. [cx, cy, r]. */
export const CANOPY: [number, number, number][] = [
  [32, 40, 2.6],
  [44, 40, 3.6],
  [56, 40, 3.2],
  [68, 40, 2.4],
  [39, 51, 3],
  [50, 51, 3.8],
  [61, 51, 2.8],
]

const FAN_ORIGIN: [number, number] = [50, 30]
const FROND_LENGTH = 28
/** Degrees from vertical. ±90 is the spine that opens it into a hand fan. */
const FROND_ANGLES = [-90, -72, -38, 0, 38, 72, 90]
/** Where the dots sit along each frond, and how they taper toward the tip. */
const DOT_STOPS: [number, number][] = [
  [0.4, 2],
  [0.62, 1.8],
  [0.82, 1.6],
  [1, 1.4],
]

/**
 * The fan as dots: one at the pivot, then a run of them out along each frond.
 * Dots rather than strokes so the crown belongs to the same visual language as
 * the canopy, and so the mark stays even-weighted when it shrinks.
 */
export function fanDots(): [number, number, number][] {
  const [ox, oy] = FAN_ORIGIN
  const dots: [number, number, number][] = [[ox, oy, 2.4]]
  for (const deg of FROND_ANGLES) {
    const t = (deg * Math.PI) / 180
    for (const [at, r] of DOT_STOPS) {
      // The spine runs flat, so its dots stop short of the full length —
      // otherwise the fan reads wider than it is tall and stops looking like
      // a fan at all.
      const length = Math.abs(deg) === 90 ? FROND_LENGTH * 0.94 : FROND_LENGTH
      dots.push([ox + Math.sin(t) * length * at, oy - Math.cos(t) * length * at, r])
    }
  }
  return dots
}
