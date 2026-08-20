#!/usr/bin/env node
// Generates the logo + wordmark lockup at the top of README.md — two SVG
// variants (light/dark), swapped via a <picture> element with a
// prefers-color-scheme media query, since GitHub actually respects that in
// rendered Markdown. No image libraries: same hand-rolled approach as
// scripts/make-icons.ts, reusing the same brand geometry so this can never
// drift from the in-app mark or the favicon.
//
//   node scripts/make-readme-hero.ts
//
// Text uses system fonts, not the self-hosted Jost — GitHub's Markdown SVG
// sandbox doesn't load external fonts, so this falls back gracefully rather
// than silently rendering the wrong face.

import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import {
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

const CANOPY_1: [number, number, number] = [0x39, 0x87, 0xe5]
const CANOPY_2: [number, number, number] = [0x19, 0x9e, 0x70]
const CANOPY_3: [number, number, number] = [0xd9, 0x59, 0x26]
const FAN_1 = CANOPY_2
const FAN_2 = CANOPY_1

const hex = (c: [number, number, number]) =>
  '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
const round = (n: number) => Math.round(n * 100) / 100

const ticks = TICKS.map(
  ([x1, y1, x2, y2]) => `      <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`,
).join('\n')
const canopy = [...CANOPY, CROWN_DOT]
  .map(([cx, cy, r]) => `      <circle cx="${round(cx)}" cy="${round(cy)}" r="${r}"/>`)
  .join('\n')
const fronds = FRONDS.map(
  ([x, y]) => `      <line x1="${FAN_ORIGIN[0]}" y1="${FAN_ORIGIN[1]}" x2="${x}" y2="${y}"/>`,
).join('\n')

function markup(variant: 'light' | 'dark'): string {
  const dark = variant === 'dark'
  // The two live themes this stands in for: Black Room Boy (dark) and
  // Sun & Moon (light) — see src/themes.ts. Only the structure (trunk +
  // timeline) and the wordmark text change; the canopy/fan read fine on
  // either background already, same as in the app.
  const structureMuted = dark ? '#898781' : '#6b6a66'
  const structureInk = dark ? '#e6e8ee' : '#14161a'
  const textColor = dark ? '#e6e8ee' : '#14161a'
  const taglineColor = dark ? '#9aa0ae' : '#52514e'

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 160" width="620" height="160">
  <defs>
    <linearGradient id="s-${variant}" gradientUnits="userSpaceOnUse" x1="256" y1="499" x2="256" y2="12">
      <stop offset="0" stop-color="${structureMuted}"/>
      <stop offset="1" stop-color="${structureInk}"/>
    </linearGradient>
    <linearGradient id="c-${variant}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${hex(CANOPY_1)}"/>
      <stop offset="0.5" stop-color="${hex(CANOPY_2)}"/>
      <stop offset="1" stop-color="${hex(CANOPY_3)}"/>
    </linearGradient>
    <linearGradient id="f-${variant}" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="${hex(FAN_1)}"/>
      <stop offset="1" stop-color="${hex(FAN_2)}"/>
    </linearGradient>
  </defs>
  <g transform="translate(10, -10) scale(0.28)">
    <g stroke="url(#s-${variant})" stroke-width="${AXIS_STROKE}" stroke-linecap="round" fill="none">
      <line x1="${AXIS_LINE[0]}" y1="${AXIS_LINE[1]}" x2="${AXIS_LINE[2]}" y2="${AXIS_LINE[3]}"/>
${ticks}
    </g>
    <line x1="${TRUNK[0]}" y1="${TRUNK[1]}" x2="${TRUNK[2]}" y2="${TRUNK[3]}" stroke="url(#s-${variant})" stroke-width="${TRUNK_STROKE}" stroke-linecap="square"/>
    <g fill="url(#c-${variant})">
${canopy}
    </g>
    <g stroke="url(#f-${variant})" stroke-width="${FAN_STROKE}" stroke-linecap="round" fill="none">
${fronds}
    </g>
  </g>
  <text x="160" y="76" font-family="'Helvetica Neue', Helvetica, Arial, sans-serif" font-size="44" letter-spacing="1" fill="${textColor}">Anjuna<tspan font-weight="700">Tree</tspan></text>
  <text x="161" y="102" font-family="'Helvetica Neue', Helvetica, Arial, sans-serif" font-size="15" fill="${taglineColor}">the Anjuna music catalogue, visualised</text>
</svg>
`
}

const outDir = path.resolve(import.meta.dirname, '../docs')
mkdirSync(outDir, { recursive: true })
for (const variant of ['light', 'dark'] as const) {
  const file = path.join(outDir, `hero-${variant}.svg`)
  writeFileSync(file, markup(variant))
  console.log(`docs/hero-${variant}.svg`)
}
