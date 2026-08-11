#!/usr/bin/env node
// Generate the Open Graph / Twitter preview image from the AnjunaTree
// brandmark — same hand-rolled rasteriser as scripts/make-icons.ts (see
// scripts/lib/png.ts), so no image-processing dependency for a 1200×630 PNG.
//
//   node scripts/make-social-card.ts
//
// Re-run when the mark or the brand colours change; the output
// (public/social-card.png) is committed like the icon set is.
//
// Composition: the mark sits large, right-of-center, with the timeline axis
// stretched across the full width at the mark's own base line — so the card
// reads as "a timeline with a mark on it", not a small icon lost in a wide
// empty frame. No text is baked into the pixels: Discord/Twitter/Slack/
// iMessage all render og:title/og:description as their own UI chrome next to
// the image, so a clean brand visual is a complete card on its own — and the
// encoder here has no font-rendering capability to draw text with anyway.

import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { encodePng } from './lib/png.ts'
import {
  ART_SIZE,
  AXIS_LINE,
  AXIS_STROKE,
  CANOPY,
  CROWN_DOT,
  FAN_ORIGIN,
  FAN_STROKE,
  FRONDS,
  TICKS,
  TRUNK,
  TRUNK_STROKE,
} from '../src/brandGeometry.ts'

// "Black Room Boy" tokens, baked — same as make-icons.ts (the card is a
// static file, so it can't follow the live theme).
const BG: [number, number, number] = [0x0b, 0x0d, 0x12]
const STRUCTURE_1: [number, number, number] = [0x89, 0x87, 0x81] // --ink-muted
const STRUCTURE_2: [number, number, number] = [0xe6, 0xe8, 0xee] // --ink
const CANOPY_1: [number, number, number] = [0x39, 0x87, 0xe5] // --label-anjunabeats
const CANOPY_2: [number, number, number] = [0x19, 0x9e, 0x70] // --label-anjunadeep
const CANOPY_3: [number, number, number] = [0xd9, 0x59, 0x26] // --label-reflections
const FAN_1: [number, number, number] = CANOPY_2
const FAN_2: [number, number, number] = CANOPY_1

const WIDTH = 1200
const HEIGHT = 630
const SS = 4 // supersampling factor, for antialiased edges

const lerp3 = (a: [number, number, number], b: [number, number, number], t: number) =>
  [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * Math.max(0, Math.min(1, t))) as [
    number,
    number,
    number,
  ]

/** Two-stop lerp across three colours, i.e. the canopy's own gradient. */
function canopyColor(t: number): [number, number, number] {
  return t <= 0.5 ? lerp3(CANOPY_1, CANOPY_2, t / 0.5) : lerp3(CANOPY_2, CANOPY_3, (t - 0.5) / 0.5)
}

function distToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1
  const dy = y2 - y1
  const len2 = dx * dx + dy * dy
  let t = len2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
}

// Ticks + trunk, same as make-icons.ts. The axis *line* is handled
// separately below, as an unbounded horizontal band, so it can stretch
// across the whole card rather than stopping at the mark's own width.
const tickAndTrunkSegs: [number, number, number, number, number][] = [
  ...TICKS.map((t): [number, number, number, number, number] => [...t, AXIS_STROKE]),
  [...TRUNK, TRUNK_STROKE],
]
const canopyDots: [number, number, number][] = [...CANOPY, CROWN_DOT]
const structureY = { min: 12, max: 499 }
const axisY = AXIS_LINE[1]

function sampleArt(ax: number, ay: number): [number, number, number] {
  let c: [number, number, number] = BG

  // The timeline axis: no x bound, so it spans the full card at the mark's
  // own base line once ax/ay are mapped from canvas space.
  if (Math.abs(ay - axisY) <= AXIS_STROKE / 2) {
    const t = 1 - (axisY - structureY.min) / (structureY.max - structureY.min)
    c = lerp3(STRUCTURE_1, STRUCTURE_2, t)
  }

  for (const [x1, y1, x2, y2, sw] of tickAndTrunkSegs) {
    if (distToSegment(ax, ay, x1, y1, x2, y2) <= sw / 2) {
      const midY = (y1 + y2) / 2
      const t = 1 - (midY - structureY.min) / (structureY.max - structureY.min)
      c = lerp3(STRUCTURE_1, STRUCTURE_2, t)
    }
  }

  for (const [cx, cy, r] of canopyDots) {
    if (Math.hypot(ax - cx, ay - cy) <= r) {
      const t = (cx - 132) / (380 - 132) // left→right across the canopy's own span
      c = canopyColor(t)
    }
  }

  for (const [x, y] of FRONDS) {
    if (distToSegment(ax, ay, FAN_ORIGIN[0], FAN_ORIGIN[1], x, y) <= FAN_STROKE / 2) {
      const t = 1 - (y - 12) / (FAN_ORIGIN[1] - 12) // outer tip → pivot
      c = lerp3(FAN_1, FAN_2, t)
    }
  }

  return c
}

function render(): Uint8Array {
  const rgba = new Uint8Array(WIDTH * HEIGHT * 4)

  // Mark scaled to the card's height, sitting right-of-center.
  const frac = 0.86
  const s = (HEIGHT * frac) / ART_SIZE
  const markCenterX = WIDTH * 0.68
  const offsetX = markCenterX - (ART_SIZE / 2) * s
  const offsetY = (HEIGHT - ART_SIZE * s) / 2

  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      let r = 0
      let g = 0
      let b = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const ax = (x + (sx + 0.5) / SS - offsetX) / s
          const ay = (y + (sy + 0.5) / SS - offsetY) / s
          const c = sampleArt(ax, ay)
          r += c[0]
          g += c[1]
          b += c[2]
        }
      }
      const n = SS * SS
      const o = (y * WIDTH + x) * 4
      rgba[o] = Math.round(r / n)
      rgba[o + 1] = Math.round(g / n)
      rgba[o + 2] = Math.round(b / n)
      rgba[o + 3] = 255
    }
  }
  return rgba
}

const outFile = path.resolve(import.meta.dirname, '../public/social-card.png')
const png = encodePng(WIDTH, HEIGHT, render())
writeFileSync(outFile, png)
console.log(`social-card.png  ${WIDTH}×${HEIGHT}  ${(png.length / 1024).toFixed(1)} kB`)
