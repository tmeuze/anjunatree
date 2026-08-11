// The AnjunaTree mark — concept 3c, "Palm fan" — as pure geometry.
//
// The tree is made of dots: seven release-dots for a canopy, on a trunk, on a
// short timeline axis. That dotted language is the mark's whole idea — it's the
// map in miniature — so the dots are drawn faithfully and everything else stays
// out of their way.
//
// The crown is a palm fan drawn as soft radiating strokes with round caps
// rather than hard filled wedges, plus one horizontal stroke straight through
// the pivot that opens it to a full 180° — the coconut palms of Anjuna beach,
// and a rave hand fan.
//
// The axis is short and quiet on purpose: present enough to say "timeline",
// never wide enough to compete with the palm.
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
export const FROND_STROKE = 2.6

export const AXIS_Y = 92
export const TICK_BOTTOM = 100
export const AXIS_LINE: [number, number, number, number] = [31, AXIS_Y, 69, AXIS_Y]
export const TICKS = [38.5, 50, 61.5]
export const TRUNK: [number, number, number, number] = [50, AXIS_Y, 50, 74]

/** The canopy — release-dots. [cx, cy, r]. */
export const CANOPY: [number, number, number][] = [
  [30, 57, 2.6],
  [43, 57, 3.6],
  [57, 57, 3.2],
  [70, 57, 2.4],
  [38, 68, 3],
  [50, 68, 3.8],
  [62, 68, 2.8],
]

export const FAN_ORIGIN: [number, number] = [50, 46]

/** Radiating fronds, in degrees from vertical, with how far each reaches. */
const FRONDS: { deg: number; length: number }[] = [
  { deg: -68, length: 46 },
  { deg: -35, length: 46 },
  { deg: 0, length: 46 },
  { deg: 35, length: 46 },
  { deg: 68, length: 46 },
]

/**
 * Half-length of the horizontal stroke through the pivot — the fan's spine.
 * Matched to the outer fronds' horizontal reach (46 * sin 68° ≈ 42.6) so the
 * spine ends directly beneath the outermost tips and the silhouette closes
 * into a fan. Any longer and it stops reading as a fan and starts reading as
 * a rule drawn under the palm.
 */
const SPINE_HALF = 42.6

/**
 * The fan as stroked segments: [x1, y1, x2, y2]. Strokes with round caps read
 * softer than filled wedges and stay even-weighted at any size, which is what
 * keeps the mark legible down at favicon scale.
 */
export function frondLines(): [number, number, number, number][] {
  const [ox, oy] = FAN_ORIGIN
  const rays = FRONDS.map(({ deg, length }): [number, number, number, number] => {
    const t = (deg * Math.PI) / 180
    return [ox, oy, ox + Math.sin(t) * length, oy - Math.cos(t) * length]
  })
  // The spine, drawn as one stroke straight through the pivot.
  rays.push([ox - SPINE_HALF, oy, ox + SPINE_HALF, oy])
  return rays
}
