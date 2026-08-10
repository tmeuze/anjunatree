import { forceCollide, forceSimulation, forceX, forceY, scaleTime } from 'd3'
import type { SimulationNodeDatum } from 'd3'
import { shapeOf } from './shapes'
import { spectrumScore } from './spectrum'
import type { CatalogRelease, LabelKey, MapNode } from './types'

export const WORLD = { w: 2600, h: 1200 }

// Colours live in the active theme (src/themes.ts), not here — in the DOM use
// labelVar(), on the canvas read them off the ThemeColors object.
export const LABEL_META: Record<LabelKey, { name: string; laneY: number }> = {
  anjunabeats: { name: 'Anjunabeats', laneY: 330 },
  anjunadeep: { name: 'Anjunadeep', laneY: 770 },
  reflections: { name: 'Anjunachill', laneY: 1080 },
}

/** CSS custom property carrying a label's colour in the current theme. */
export const labelVar = (lane: LabelKey) => `var(--label-${lane})`

export const LABEL_KEYS = Object.keys(LABEL_META) as LabelKey[]

const RADIUS: Record<string, number> = { Album: 6.5, EP: 4.5, Single: 3 }

const TIME_MIN = Date.UTC(2000, 0, 1)

const SPECTRUM_Y = { top: 70, bottom: WORLD.h - 70 }

export const spectrumToY = (s: number) =>
  SPECTRUM_Y.top + s * (SPECTRUM_Y.bottom - SPECTRUM_Y.top)

function parseReleaseTime(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  // Year-only dates land mid-year, year-month dates mid-month, so they don't
  // all pile up on January 1.
  const t = Date.UTC(y, m ? m - 1 : 6, d || 15)
  return Math.max(t, TIME_MIN)
}

export interface CatalogLayout {
  nodes: MapNode[]
  timeToX: (t: number) => number
  timeDomain: [number, number]
}

export interface CatalogFile {
  releases: CatalogRelease[]
  /** ISO date the weekly refresh last changed the data */
  generatedAt: string | null
}

export async function loadCatalog(): Promise<CatalogFile> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/catalog.json`)
  if (!res.ok) throw new Error(`Failed to load catalogue: ${res.status}`)
  const json = (await res.json()) as { releases: CatalogRelease[]; generatedAt?: string }
  return { releases: json.releases, generatedAt: json.generatedAt ?? null }
}

function runSim(nodes: MapNode[], targetY: (n: MapNode) => number, yStrength: number) {
  const sim = forceSimulation(nodes as unknown as SimulationNodeDatum[])
    .force('x', forceX<MapNode>((d) => d.lx).strength(0.85))
    .force('y', forceY<MapNode>(targetY).strength(yStrength))
    .force('collide', forceCollide<MapNode>((d) => d.r + 0.7))
    .stop()
  sim.tick(260)
}

export function layoutCatalog(releases: CatalogRelease[]): CatalogLayout {
  const usable = releases.filter((r) => r.year !== null && r.type !== 'Broadcast')

  const nodes: MapNode[] = usable.map((rel) => {
    // AnjunaDigital was a short-lived Anjunabeats offshoot (7 releases) — fold
    // it into the Anjunabeats lane rather than giving it a fourth color.
    const lane = (rel.label === 'anjunadigital' ? 'anjunabeats' : rel.label) as LabelKey
    return {
      rel,
      lane,
      time: parseReleaseTime(rel.date),
      r: RADIUS[rel.type] ?? 3,
      shape: shapeOf(rel),
      spectrum: spectrumScore(rel.artists.length ? rel.artists : [rel.artist], lane),
      lx: 0,
      ly: 0,
      sx: 0,
      sy: 0,
      x: 0,
      y: 0,
    }
  })

  const maxTime = Math.max(...nodes.map((n) => n.time)) + 1000 * 60 * 60 * 24 * 60
  const x = scaleTime()
    .domain([TIME_MIN, maxTime])
    .range([70, WORLD.w - 50])

  for (const n of nodes) {
    n.lx = x(n.time)
    n.x = n.lx
    n.y = LABEL_META[n.lane].laneY
  }

  // Lane view: pack around each label's lane.
  runSim(nodes, (n) => LABEL_META[n.lane].laneY, 0.045)
  for (const n of nodes) {
    n.lx = n.x
    n.ly = n.y
  }

  // Spectrum view: pack around each release's genre position.
  for (const n of nodes) {
    n.x = n.lx
    n.y = spectrumToY(n.spectrum)
  }
  runSim(nodes, (n) => spectrumToY(n.spectrum), 0.09)
  for (const n of nodes) {
    n.sx = n.x
    n.sy = n.y
  }

  return {
    nodes,
    timeToX: (t) => x(t),
    timeDomain: [TIME_MIN, maxTime],
  }
}
