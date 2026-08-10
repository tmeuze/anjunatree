#!/usr/bin/env node
// Generate the favicon and PWA icon set from the AnjunaTree brandmark — a
// canopy of release-dots on a timeline axis. No image libraries needed: this
// rasterises the same geometry the React <TreeMark> draws, and writes PNGs
// with Node's built-in zlib.
//
//   node scripts/make-icons.mjs
//
// Re-run when the mark or the brand colours change; the output is committed.
// Geometry is kept in step with src/Brand.tsx by hand — they're both small.

import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'

// Icons can't follow the app's theme, so they're painted for the dark surface,
// matching the manifest's theme_color and the "Black Room Boy" default.
const BG = [0x0b, 0x0d, 0x12] // --surface
const AXIS = [0x6f, 0x74, 0x7f] // muted ink, the timeline
const INK = [0xe6, 0xe8, 0xee] // --ink, trunk + canopy
const CROWN = [0x19, 0x9e, 0x70] // --label-anjunadeep, the newest release
const SS = 4 // supersampling factor, for antialiased edges

// --- the mark, in the SVG's 96x96 artboard ----------------------------------

const AXIS_STROKE = 1.8
const TRUNK_STROKE = 4

const AXIS_LINES = [
  [10, 86, 86, 86], // the timeline itself
  [26, 86, 26, 91], // ticks
  [48, 86, 48, 91],
  [70, 86, 70, 91],
]
const TRUNK = [48, 86, 48, 58]
const CANOPY = [
  [34, 52, 3],
  [48, 50, 4],
  [62, 52, 3],
  [26, 41, 2.6],
  [40, 40, 4],
  [56, 40, 3.6],
  [70, 41, 2.6],
  [34, 30, 3],
  [48, 29, 2.6],
  [62, 30, 3.6],
]
const CROWN_DOT = [48, 18, 5]

/** Content spans y 13..91, whose centre is 52 — shift up to centre it optically. */
const Y_NUDGE = 4

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

/** rgba: Uint8Array of size*size*4 */
function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type: RGBA
  // 10..12 stay 0: deflate, adaptive filtering, no interlace

  // One filter byte (0 = none) per scanline.
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

/** Distance from a point to a segment — a round-capped stroke is just this ≤ half-width. */
function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len2 = dx * dx + dy * dy
  let t = len2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
}

/** Colour of the artboard at (ax, ay), painted in SVG order — later wins. */
function sampleArt(ax, ay) {
  let c = BG
  for (const [x1, y1, x2, y2] of AXIS_LINES) {
    if (distToSegment(ax, ay, x1, y1, x2, y2) <= AXIS_STROKE / 2) c = AXIS
  }
  if (distToSegment(ax, ay, ...TRUNK) <= TRUNK_STROKE / 2) c = INK
  for (const [cx, cy, r] of CANOPY) {
    if (Math.hypot(ax - cx, ay - cy) <= r) c = INK
  }
  const [kx, ky, kr] = CROWN_DOT
  if (Math.hypot(ax - kx, ay - ky) <= kr) c = CROWN
  return c
}

function render(size, contentFraction) {
  const rgba = new Uint8Array(size * size * 4)
  const s = (size * contentFraction) / 96
  const origin = (size - 96 * s) / 2

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0
      let g = 0
      let b = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const ax = (x + (sx + 0.5) / SS - origin) / s
          const ay = (y + (sy + 0.5) / SS - origin) / s + Y_NUDGE
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
  { file: 'icon-192.png', size: 192, frac: 0.88 },
  { file: 'icon-512.png', size: 512, frac: 0.88 },
  // Maskable icons get cropped to a circle on some launchers, so the mark has
  // to sit inside the middle 80% safe zone.
  { file: 'icon-maskable-512.png', size: 512, frac: 0.62 },
  { file: 'apple-touch-icon.png', size: 180, frac: 0.88 },
]

for (const { file, size, frac } of targets) {
  const png = encodePng(size, render(size, frac))
  writeFileSync(path.join(outDir, file), png)
  console.log(`${file.padEnd(24)} ${size}×${size}  ${(png.length / 1024).toFixed(1)} kB`)
}

// A crisp vector favicon for browser tabs — same mark, fixed dark palette so it
// reads on both light and dark browser chrome.
const axis = AXIS_LINES.map(
  ([x1, y1, x2, y2]) => `    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`,
).join('\n')
const canopy = CANOPY.map(([cx, cy, r]) => `    <circle cx="${cx}" cy="${cy}" r="${r}"/>`).join(
  '\n',
)
const hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('')

writeFileSync(
  path.join(outDir, 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
  <rect width="96" height="96" rx="18" fill="${hex(BG)}"/>
  <g transform="translate(0 -${Y_NUDGE})">
    <g stroke="${hex(AXIS)}" stroke-width="${AXIS_STROKE}" stroke-linecap="round">
${axis}
    </g>
    <line x1="${TRUNK[0]}" y1="${TRUNK[1]}" x2="${TRUNK[2]}" y2="${TRUNK[3]}" stroke="${hex(
      INK,
    )}" stroke-width="${TRUNK_STROKE}" stroke-linecap="round"/>
    <g fill="${hex(INK)}">
${canopy}
    </g>
    <circle cx="${CROWN_DOT[0]}" cy="${CROWN_DOT[1]}" r="${CROWN_DOT[2]}" fill="${hex(CROWN)}"/>
  </g>
</svg>
`,
)
console.log('favicon.svg')
