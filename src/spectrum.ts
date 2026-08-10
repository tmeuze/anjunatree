// A curated genre spectrum: 0 = uplifting trance, 1 = ambient/chill.
// There is no reliable per-release genre data in any open source, so this is
// editorial by design — a label baseline nudged by hand-placed positions for
// the roster's defining artists, with a deterministic per-artist jitter so
// unknown artists spread naturally around their label's center of gravity.
import type { LabelKey } from './types'

export const LABEL_BASE: Record<LabelKey, number> = {
  anjunabeats: 0.18,
  anjunadeep: 0.58,
  reflections: 0.88,
}

const ARTIST_POSITION: Record<string, number> = {
  // Anjunabeats core — trance and prog-trance
  'above & beyond': 0.15,
  oceanlab: 0.22,
  'ilan bluestone': 0.1,
  genix: 0.07,
  'sunny lax': 0.1,
  'andrew bayer': 0.28,
  'mat zo': 0.2,
  arty: 0.18,
  audien: 0.16,
  'seven lions': 0.08,
  'jason ross': 0.12,
  'cosmic gate': 0.1,
  'gabriel & dresden': 0.2,
  'super8 & tab': 0.14,
  'oliver smith': 0.16,
  'kyau & albert': 0.18,
  'boom jinx': 0.25,
  'norin & rad': 0.15,
  grum: 0.3,
  'gareth emery': 0.14,
  'maor levi': 0.18,
  signalrunners: 0.15,
  'nitrous oxide': 0.12,
  'daniel kandi': 0.1,
  'trance wax': 0.24,
  gardenstate: 0.32,
  'josep gres': 0.3,
  // Anjunadeep core — deep, melodic, organic house
  'lane 8': 0.55,
  yotto: 0.5,
  'ben bohmer': 0.6,
  tinlicker: 0.58,
  dusky: 0.62,
  cubicolor: 0.68,
  luttrell: 0.55,
  marsh: 0.52,
  qrion: 0.6,
  'eli & fur': 0.55,
  cri: 0.62,
  'jody wisternoff': 0.58,
  'james grant': 0.62,
  'way out west': 0.5,
  olan: 0.45,
  'nox vahn': 0.58,
  braxton: 0.5,
  'simon doty': 0.55,
  hausman: 0.62,
  anderholm: 0.6,
  'leaving laurel': 0.68,
  'joseph ray': 0.55,
  '16bl': 0.6,
  '16 bit lolitas': 0.6,
  'david hohme': 0.56,
  durante: 0.6,
}

const strip = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{Mark}+/gu, '')
    .replace(/\s+/g, ' ')
    .trim()

// Small deterministic hash → [-1, 1], so an artist's jitter is stable.
function hashSigned(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) / 4294967295) * 2 - 1
}

export function spectrumScore(artists: string[], lane: LabelKey): number {
  const base = LABEL_BASE[lane]
  const known = artists.map(strip).map((a) => ARTIST_POSITION[a]).filter((v) => v !== undefined)

  let score: number
  if (!known.length) {
    score = base
  } else {
    const artistAvg = known.reduce((a, b) => a + b, 0) / known.length
    // The chill label says more about a release than its artist's home genre
    // (e.g. an Above & Beyond ambient album); elsewhere the artist dominates.
    const labelWeight = lane === 'reflections' ? 0.75 : 0.4
    score = base * labelWeight + artistAvg * (1 - labelWeight)
  }

  score += hashSigned(artists.join('|')) * 0.05
  return Math.min(0.97, Math.max(0.03, score))
}
