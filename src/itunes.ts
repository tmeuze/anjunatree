// Release matching against the iTunes Search API (no auth required).
//
// Apple serves `access-control-allow-origin: *` on both /search and /lookup,
// so the browser can call them directly and the app needs no server of its
// own. Local dev still goes through the Vite proxy at /itunes; set
// VITE_ITUNES_BASE to a proxy origin if Apple ever drops that header.
//
// Strategy: search *albums* first — a release maps naturally to an iTunes
// collection (singles and EPs are collections there too, with a "- Single" /
// "- EP" suffix) — and only fall back to a song search when no collection
// clears the bar. Both paths gate on artist overlap so a same-titled release
// by someone else is rejected rather than shown as a wrong match.
import type { AlbumTrack, CatalogRelease } from './types'

export interface ReleaseMatch {
  collectionId: number | null
  collectionName: string
  artworkUrl: string
  /** the track the fallback song-search matched, to auto-play first */
  matchedTrackName: string | null
  /** single playable track when only the song search matched */
  fallbackTrack: AlbumTrack | null
}

interface ItunesItem {
  wrapperType: string
  collectionType?: string
  previewUrl?: string
  trackName?: string
  artistName?: string
  collectionName?: string
  artworkUrl100?: string
  collectionId?: number
  trackTimeMillis?: number
  discNumber?: number
  trackNumber?: number
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{Letter}\p{Number} ]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const tokens = (s: string) => new Set(normalize(s).split(' ').filter(Boolean))

function overlap(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0
  let n = 0
  for (const t of a) if (b.has(t)) n++
  return n / Math.min(a.size, b.size)
}

/** "Group Therapy (Bonus Track Version)" → "group therapy"; "Elf - Single" → "elf" */
const coreName = (s: string) =>
  normalize(s.replace(/\(.*?\)/g, ' ').replace(/\[.*?\]/g, ' ')).replace(
    /\s+(single|ep)$/,
    '',
  )

const titleScore = (want: string, got: string): number => {
  if (!want || !got) return 0
  if (want === got) return 1
  if (got.startsWith(want) || want.startsWith(got)) return 0.75
  return overlap(tokens(want), tokens(got)) * 0.6
}

const isVariousArtists = (rel: CatalogRelease) =>
  normalize(rel.artist).includes('various artists')

const ITUNES_BASE =
  import.meta.env.VITE_ITUNES_BASE ?? (import.meta.env.DEV ? '/itunes' : 'https://itunes.apple.com')

async function search(params: Record<string, string>): Promise<ItunesItem[]> {
  const res = await fetch(
    `${ITUNES_BASE}/search?${new URLSearchParams({ media: 'music', ...params })}`,
  )
  if (!res.ok) throw new Error(`iTunes search failed: ${res.status}`)
  const json = (await res.json()) as { results: ItunesItem[] }
  return json.results
}

const artwork = (item: ItunesItem, size: number) =>
  (item.artworkUrl100 ?? '').replace('100x100', `${size}x${size}`)

export async function findRelease(rel: CatalogRelease): Promise<ReleaseMatch | null> {
  const va = isVariousArtists(rel)
  const wantTitle = coreName(rel.title)
  const artistTokens = tokens(rel.artist)
  const term = va ? rel.title : `${rel.artists[0] ?? rel.artist} ${rel.title.replace(/\(.*?\)/g, '')}`

  const albums = (await search({ term: term.trim(), entity: 'album', limit: '25' })).filter(
    (c) => c.wrapperType === 'collection' && c.collectionId,
  )
  let best: { item: ItunesItem; score: number } | null = null
  for (const c of albums) {
    const t = titleScore(wantTitle, coreName(c.collectionName ?? ''))
    const a = va ? 0.6 : overlap(artistTokens, tokens(c.artistName ?? ''))
    if (t < 0.65 || (!va && a < 0.34)) continue
    // Tiny length penalty so "X" outranks "X (Remixes)" on otherwise-equal scores.
    const score = t * 6 + a * 4 - (c.collectionName?.length ?? 0) / 500
    if (!best || score > best.score) best = { item: c, score }
  }
  if (best) {
    return {
      collectionId: best.item.collectionId!,
      collectionName: best.item.collectionName ?? '',
      artworkUrl: artwork(best.item, 300),
      matchedTrackName: null,
      fallbackTrack: null,
    }
  }

  // Song fallback — same artist gate, useful for tracks whose release never
  // made it to iTunes as its own collection.
  const songs = (await search({ term: term.trim(), entity: 'song', limit: '25' })).filter(
    (t) => t.previewUrl,
  )
  let bestSong: { item: ItunesItem; score: number } | null = null
  for (const s of songs) {
    const t = Math.max(
      titleScore(wantTitle, coreName(s.trackName ?? '')),
      titleScore(wantTitle, coreName(s.collectionName ?? '')) * 0.9,
    )
    const a = va ? 0.6 : overlap(artistTokens, tokens(s.artistName ?? ''))
    if (t < 0.55 || (!va && a < 0.34)) continue
    const score = t * 6 + a * 4
    if (!bestSong || score > bestSong.score) bestSong = { item: s, score }
  }
  if (!bestSong) return null
  const s = bestSong.item
  return {
    collectionId: s.collectionId ?? null,
    collectionName: s.collectionName ?? '',
    artworkUrl: artwork(s, 300),
    matchedTrackName: s.trackName ?? null,
    fallbackTrack: {
      trackName: s.trackName ?? rel.title,
      artistName: s.artistName ?? rel.artist,
      previewUrl: s.previewUrl!,
      durationMs: s.trackTimeMillis ?? null,
      discNumber: s.discNumber ?? 1,
      trackNumber: s.trackNumber ?? 1,
    },
  }
}

/** Full track list for an iTunes collection, each with its own 30s preview. */
export async function lookupTracks(collectionId: number): Promise<AlbumTrack[]> {
  const params = new URLSearchParams({ id: String(collectionId), entity: 'song', limit: '200' })
  const res = await fetch(`${ITUNES_BASE}/lookup?${params}`)
  if (!res.ok) throw new Error(`iTunes lookup failed: ${res.status}`)
  const json = (await res.json()) as { results: ItunesItem[] }
  return json.results
    .filter((t) => t.wrapperType === 'track')
    .map((t) => ({
      trackName: t.trackName ?? 'Unknown',
      artistName: t.artistName ?? '',
      previewUrl: t.previewUrl ?? null,
      durationMs: t.trackTimeMillis ?? null,
      discNumber: t.discNumber ?? 1,
      trackNumber: t.trackNumber ?? 0,
    }))
    .sort((a, b) => a.discNumber - b.discNumber || a.trackNumber - b.trackNumber)
}
