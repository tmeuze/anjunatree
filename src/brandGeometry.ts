// The AnjunaTree mark, transcribed exactly from brand/brandmark/at-palm-fan.svg
// (extracted programmatically from its path data — see git history for the
// extraction script — not hand-approximated).
//
// The artboard is the source file's own 512×512 space, kept as-is rather than
// renormalised, so these numbers can always be diffed straight against the
// original art.
//
// Three parts, three gradients (applied by <TreeMark> in Brand.tsx and by
// scripts/make-icons.ts):
//   structure — the timeline axis + trunk
//   canopy    — the seven release-dots, plus the crown dot that joins the fan
//   fan       — the seven radiating fronds
//
// This is the single source of truth; the SVG component and the icon
// rasteriser both import it, so they can't drift apart.

export const ART_SIZE = 512

/** Axis: the base line plus its (deliberately uneven, hand-drawn) ticks. */
export const AXIS_STROKE = 5.333333
export const AXIS_LINE: [number, number, number, number] = [83, 474, 428, 474]
export const TICKS: [number, number, number, number][] = [
  [132, 474, 132, 499],
  [256, 474, 256, 493],
  [316.25, 474, 316.38, 486.54],
  [190.13, 474, 190.13, 486.46],
  [380, 474, 380, 499],
]

export const TRUNK_STROKE = 16
export const TRUNK: [number, number, number, number] = [256, 318.33, 256, 467.67]

/** The canopy — seven release-dots. [cx, cy, r]. */
export const CANOPY: [number, number, number][] = [
  [181.33, 286.33, 13.87],
  [256, 275.67, 18.13],
  [330.67, 286.33, 13.87],
  [138.67, 227.67, 11.73],
  [213.33, 222.33, 18.13],
  [298.67, 222.33, 16],
  [373.33, 227.67, 11.73],
]

/** The crown dot the fan grows out of — visually the newest release. */
export const CROWN_DOT: [number, number, number] = [256, 179.67, 18.13]

export const FAN_STROKE = 13.866666
export const FAN_ORIGIN: [number, number] = [256, 134.67]
export const FRONDS: [number, number][] = [
  [256, 12],
  [182.4, 33.87],
  [329.6, 33.87],
  [135.47, 90.93],
  [376.53, 90.93],
  [132.27, 167.73],
  [379.73, 167.73],
]
