#!/usr/bin/env node
// Generate the PWA icon set. No image libraries needed — this rasterises the
// mark by hand and writes PNGs with Node's built-in zlib.
//
//   node scripts/make-icons.mjs
//
// Re-run only when the mark or brand colours change; the output is committed.

import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'

const BG = [0x0b, 0x0d, 0x12] // --surface, "Black Room Boy"
const TOP = [0x39, 0x87, 0xe5] // --label-anjunabeats
const BOTTOM = [0x19, 0x9e, 0x70] // --label-anjunadeep
const SS = 3 // supersampling factor, for antialiased edges

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

/** Signed area test — positive on the inside for counter-clockwise vertices. */
const edge = (ax, ay, bx, by, px, py) => (bx - ax) * (py - ay) - (by - ay) * (px - ax)

function render(size, triangleFraction) {
  const rgba = new Uint8Array(size * size * 4)
  const c = size / 2
  const h = size * triangleFraction
  const w = h * 1.08
  // Apex up; slight optical lift so the mark reads as centred.
  const cy = c + h * 0.06
  const ax = c
  const ay = cy - h / 2
  const bx = c + w / 2
  const by = cy + h / 2
  const cx2 = c - w / 2
  const cy2 = cy + h / 2

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let hits = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS
          const py = y + (sy + 0.5) / SS
          const e0 = edge(ax, ay, bx, by, px, py)
          const e1 = edge(bx, by, cx2, cy2, px, py)
          const e2 = edge(cx2, cy2, ax, ay, px, py)
          if ((e0 >= 0 && e1 >= 0 && e2 >= 0) || (e0 <= 0 && e1 <= 0 && e2 <= 0)) hits++
        }
      }
      const cover = hits / (SS * SS)
      // Vertical gradient across the triangle's own span.
      const t = Math.min(1, Math.max(0, (y - ay) / h))
      const fg = [0, 1, 2].map((i) => Math.round(TOP[i] + (BOTTOM[i] - TOP[i]) * t))
      const o = (y * size + x) * 4
      for (let i = 0; i < 3; i++) {
        rgba[o + i] = Math.round(BG[i] + (fg[i] - BG[i]) * cover)
      }
      rgba[o + 3] = 255
    }
  }
  return rgba
}

const outDir = path.resolve(import.meta.dirname, '../public/icons')
mkdirSync(outDir, { recursive: true })

const targets = [
  { file: 'icon-192.png', size: 192, frac: 0.62 },
  { file: 'icon-512.png', size: 512, frac: 0.62 },
  // Maskable icons get cropped to a circle on some launchers, so the mark has
  // to sit inside the middle 80% safe zone.
  { file: 'icon-maskable-512.png', size: 512, frac: 0.44 },
  { file: 'apple-touch-icon.png', size: 180, frac: 0.62 },
]

for (const { file, size, frac } of targets) {
  const png = encodePng(size, render(size, frac))
  writeFileSync(path.join(outDir, file), png)
  console.log(`${file.padEnd(24)} ${size}×${size}  ${(png.length / 1024).toFixed(1)} kB`)
}

// A crisp vector favicon for browser tabs.
writeFileSync(
  path.join(outDir, 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#3987e5"/><stop offset="1" stop-color="#199e70"/>
  </linearGradient></defs>
  <rect width="64" height="64" rx="12" fill="#0b0d12"/>
  <path d="M32 14 L52 48 L12 48 Z" fill="url(#g)"/>
</svg>
`,
)
console.log('favicon.svg')
