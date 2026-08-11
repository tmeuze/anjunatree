#!/usr/bin/env node
// Generate the favicon and PWA icon set from the AnjunaTree brandmark.
// No image libraries needed — this rasterises the same geometry <TreeMark>
// draws, and writes PNGs with Node's built-in zlib.
//
//   node scripts/make-icons.ts
//
// Re-run when the mark or the brand colours change; the output is committed.
// Geometry is imported from src/brandGeometry.ts — the same numbers <TreeMark>
// draws, so the icons can never drift from the in-app mark.
//
// Icons can't follow the live theme (they're static files), so they're baked
// for the "Black Room Boy" default. <TreeMark> uses true SVG gradients via CSS
// custom properties; here, with no CSS available, each shape is coloured by
// interpolating along the same gradient by its own position — a lerp per dot
// or line rather than a single flat fill, so the icon still reads as a
// gradient rather than a solid colour.

import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
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

// "Black Room Boy" tokens, baked — see themes.ts for how these combine live.
const BG: [number, number, number] = [0x0b, 0x0d, 0x12]
const STRUCTURE_1: [number, number, number] = [0x89, 0x87, 0x81] // --ink-muted
const STRUCTURE_2: [number, number, number] = [0xe6, 0xe8, 0xee] // --ink
const CANOPY_1: [number, number, number] = [0x39, 0x87, 0xe5] // --label-anjunabeats
const CANOPY_2: [number, number, number] = [0x19, 0x9e, 0x70] // --label-anjunadeep
const CANOPY_3: [number, number, number] = [0xd9, 0x59, 0x26] // --label-reflections
const FAN_1: [number, number, number] = CANOPY_2
const FAN_2: [number, number, number] = CANOPY_1

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

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buf: Buffer): number {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePng(size: number, rgba: Uint8Array): Buffer {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type: RGBA
  // 10..12 stay 0: deflate, adaptive filtering, no interlace

  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1)
    raw[rowStart] = 0
    Buffer.from(rgba.buffer, y * size * 4, size * 4).copy(raw, rowStart + 1)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
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

// Structure = the axis line + its ticks (thin) and the trunk (thick), each
// with its own stroke width. The gradient runs bottom (axis, y≈474) to top
// (trunk top, y≈318); approximate every segment's colour by its own midpoint
// height.
const structureSegs: [number, number, number, number, number][] = [
  [...AXIS_LINE, AXIS_STROKE],
  ...TICKS.map((t): [number, number, number, number, number] => [...t, AXIS_STROKE]),
  [...TRUNK, TRUNK_STROKE],
]
const canopyDots: [number, number, number][] = [...CANOPY, CROWN_DOT]
const structureY = { min: 12, max: 499 }

function sampleArt(ax: number, ay: number): [number, number, number] {
  let c: [number, number, number] = BG

  for (const [x1, y1, x2, y2, sw] of structureSegs) {
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

function render(size: number, contentFraction: number): Uint8Array {
  const rgba = new Uint8Array(size * size * 4)
  const s = (size * contentFraction) / ART_SIZE
  const origin = (size - ART_SIZE * s) / 2

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0
      let g = 0
      let b = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const ax = (x + (sx + 0.5) / SS - origin) / s
          const ay = (y + (sy + 0.5) / SS - origin) / s
          const c = sampleArt(ax, ay)
          r += c[0]
          g += c[1]
          b += c[2]
        }
      }
      const n = SS * SS
      const o = (y * size + x) * 4
      rgba[o] = Math.round(r / n)
      rgba[o + 1] = Math.round(g / n)
      rgba[o + 2] = Math.round(b / n)
      rgba[o + 3] = 255
    }
  }
  return rgba
}

const outDir = path.resolve(import.meta.dirname, '../public/icons')
mkdirSync(outDir, { recursive: true })

const targets = [
  { file: 'icon-192.png', size: 192, frac: 0.92 },
  { file: 'icon-512.png', size: 512, frac: 0.92 },
  // Maskable icons get cropped to a circle on some launchers, so the mark has
  // to sit inside the middle 80% safe zone.
  { file: 'icon-maskable-512.png', size: 512, frac: 0.64 },
  { file: 'apple-touch-icon.png', size: 180, frac: 0.92 },
]

for (const { file, size, frac } of targets) {
  const png = encodePng(size, render(size, frac))
  writeFileSync(path.join(outDir, file), png)
  console.log(`${file.padEnd(24)} ${size}×${size}  ${(png.length / 1024).toFixed(1)} kB`)
}

// A crisp vector favicon for browser tabs — same mark, fixed dark-theme
// gradients (SVG <linearGradient>, so it's a real gradient, not a lerp) so it
// reads on both light and dark browser chrome.
const hex = (c: [number, number, number]) =>
  '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
const round = (n: number) => Math.round(n * 100) / 100

const ticks = TICKS.map(
  ([x1, y1, x2, y2]) => `    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`,
).join('\n')
const canopy = canopyDots
  .map(([cx, cy, r]) => `    <circle cx="${round(cx)}" cy="${round(cy)}" r="${r}"/>`)
  .join('\n')
const fronds = FRONDS.map(
  ([x, y]) => `    <line x1="${FAN_ORIGIN[0]}" y1="${FAN_ORIGIN[1]}" x2="${x}" y2="${y}"/>`,
).join('\n')

writeFileSync(
  path.join(outDir, 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-24 -24 560 560">
  <rect x="-24" y="-24" width="560" height="560" rx="80" fill="${hex(BG)}"/>
  <defs>
    <linearGradient id="s" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="${hex(STRUCTURE_1)}"/>
      <stop offset="1" stop-color="${hex(STRUCTURE_2)}"/>
    </linearGradient>
    <linearGradient id="c" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${hex(CANOPY_1)}"/>
      <stop offset="0.5" stop-color="${hex(CANOPY_2)}"/>
      <stop offset="1" stop-color="${hex(CANOPY_3)}"/>
    </linearGradient>
    <linearGradient id="f" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="${hex(FAN_1)}"/>
      <stop offset="1" stop-color="${hex(FAN_2)}"/>
    </linearGradient>
  </defs>
  <g stroke="url(#s)" stroke-width="${AXIS_STROKE}" stroke-linecap="round">
    <line x1="${AXIS_LINE[0]}" y1="${AXIS_LINE[1]}" x2="${AXIS_LINE[2]}" y2="${AXIS_LINE[3]}"/>
${ticks}
  </g>
  <line x1="${TRUNK[0]}" y1="${TRUNK[1]}" x2="${TRUNK[2]}" y2="${TRUNK[3]}" stroke="url(#s)" stroke-width="${TRUNK_STROKE}" stroke-linecap="square"/>
  <g fill="url(#c)">
${canopy}
  </g>
  <g stroke="url(#f)" stroke-width="${FAN_STROKE}" stroke-linecap="round">
${fronds}
  </g>
</svg>
`,
)
console.log('favicon.svg')
