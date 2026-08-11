// Release matching against the iTunes Search API (no auth required).
//
// Apple allows direct browser calls to /search and /lookup, so the app needs
// no server of its own. Local dev still goes through the Vite proxy at
// /itunes; set VITE_ITUNES_BASE to a proxy origin if that ever changes.
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

/**
 * Apple echoes the caller's Origin into `access-control-allow-origin` but sends
 * no `Vary: Origin`. A shared HTTP cache can therefore replay a response that
 * was authorised for a *different* origin, and the browser then blocks it as a
 * CORS failure — seen on iOS Safari once the site has been opened on two
 * origins (say github.io and the custom domain). So we bypass the HTTP cache
 * and keep our own, below.
 */
const ITUNES_FETCH: RequestInit = { cache: 'no-store', credentials: 'omit' }

/**
 * Apple also drops the occasional connection outright under repeated requests
 * — roughly one in twenty when measured back to back. In the browser that
 * surfaces as a rejected fetch ("Load failed" in Safari), which is what the
 * intermittent "Lookup failed" was: browsing the map fires several requests
 * per release, so the odds of hitting one climb quickly, while a single
 * deep-link usually gets through. Retrying briefly absorbs it.
 */
const RETRY_DELAYS_MS = [250, 900]

/**
 * Responses are immutable for our purposes, and bypassing the HTTP cache would
 * otherwise mean re-requesting the same release every time it's opened. One
 * in-memory cache per session fixes that and cuts the request count sharply,
 * which is itself the best defence against the dropped connections above.
 */
const responseCache = new Map<string, Promise<ItunesItem[]>>()

async function fetchItems(url: string): Promise<ItunesItem[]> {
  let lastError: unknown
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt - 1]))
    }
    try {
      const res = await fetch(url, ITUNES_FETCH)
      // 4xx won't fix itself; only retry transient server-side failures.
      if (!res.ok) {
        if (res.status < 500 && res.status !== 429) {
          throw new Error(`iTunes returned ${res.status}`)
        }
        lastError = new Error(`iTunes returned ${res.status}`)
        continue
      }
      const json = (await res.json()) as { results: ItunesItem[] }
      return json.results
    } catch (e) {
      lastError = e
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('Could not reach the iTunes catalogue')
}

function cachedFetch(url: string): Promise<ItunesItem[]> {
  const hit = responseCache.get(url)
  if (hit) return hit
  // Cache the promise, not the result, so concurrent callers share one request.
  const pending = fetchItems(url).catch((e) => {
    // A failure must not be cached, or one blip poisons that release forever.
    responseCache.delete(url)
    throw e
  })
  responseCache.set(url, pending)
  return pending
}

async function search(params: Record<string, string>): Promise<ItunesItem[]> {
  return cachedFetch(
    `${ITUNES_BASE}/search?${new URLSearchParams({ media: 'music', ...params })}`,
  )
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
  const results = await cachedFetch(`${ITUNES_BASE}/lookup?${params}`)
  return results
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
