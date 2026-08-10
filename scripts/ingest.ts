// Ingest the Anjuna label catalogs from MusicBrainz into public/data/catalog.json.
// MusicBrainz etiquette: 1 request/second, descriptive User-Agent.
// Run with: npm run ingest

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

// MusicBrainz asks that clients identify themselves with a contact — a URL is
// acceptable, which keeps a personal address out of a public repo. Forks can
// set ANJUNATREE_CONTACT to their own site or email.
const CONTACT = process.env.ANJUNATREE_CONTACT ?? 'https://anjunatree.com'
const USER_AGENT = `AnjunaTree/0.1 ( ${CONTACT} )`
const MB_ROOT = 'https://musicbrainz.org/ws/2'
const PAGE_SIZE = 100
const REQUEST_INTERVAL_MS = 1100

// MusicBrainz splits some Anjuna imprints into multiple label entities; the
// `key` folds each entity into the lane the app shows (Explorations is an
// Anjunadeep series; "Reflections" and "Anjunachill" are the same imprint
// before/after its rebrand). Order matters: a release on two entities keeps
// the earlier entry's key.
const LABELS = [
  { key: 'anjunabeats', name: 'Anjunabeats', mbid: '4fcdf709-d710-4524-ae76-0d1c19c77d42' },
  { key: 'anjunadeep', name: 'Anjunadeep', mbid: '5b66608b-878d-4d7a-a96b-6da38356f6c8' },
  { key: 'anjunadeep', name: 'Anjunadeep Explorations', mbid: '71c0430b-30f0-4280-83b1-91ec0faa54a0' },
  { key: 'reflections', name: 'Reflections', mbid: '23dc1e6f-f051-4fcf-a99e-ab1a39d73c65' },
  { key: 'reflections', name: 'Anjunachill', mbid: '6f890c63-3b43-4e8a-8b4f-51ea110c9365' },
  { key: 'anjunadigital', name: 'AnjunaDigital', mbid: '298fb638-9c54-4b4f-a3cb-1ff7b34ea6d9' },
] as const

type LabelKey = (typeof LABELS)[number]['key']

interface MbArtistCredit {
  name: string
  joinphrase?: string
  artist: { id: string; name: string }
}

interface MbRelease {
  id: string
  title: string
  date?: string
  'artist-credit'?: MbArtistCredit[]
  'release-group'?: {
    id: string
    'primary-type'?: string
    'secondary-types'?: string[]
    'first-release-date'?: string
  }
  'label-info'?: { 'catalog-number'?: string; label?: { id: string } }[]
}

interface CatalogEntry {
  /** MusicBrainz release-group id — stable identity for one logical release */
  id: string
  title: string
  artist: string
  artistIds: string[]
  artists: string[]
  label: LabelKey
  date: string
  year: number | null
  catno: string | null
  type: string
  secondaryTypes: string[]
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

let lastRequestAt = 0
async function mbFetch(url: string, attempt = 0): Promise<unknown> {
  const wait = lastRequestAt + REQUEST_INTERVAL_MS - Date.now()
  if (wait > 0) await sleep(wait)
  lastRequestAt = Date.now()

  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (res.status === 503 || res.status === 429) {
    if (attempt >= 5) throw new Error(`Rate-limited too many times: ${url}`)
    const backoff = 2000 * (attempt + 1)
    console.warn(`  ${res.status} from MusicBrainz, backing off ${backoff}ms`)
    await sleep(backoff)
    return mbFetch(url, attempt + 1)
  }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`)
  return res.json()
}

function renderArtistCredit(credit: MbArtistCredit[] | undefined): string {
  if (!credit?.length) return 'Unknown Artist'
  return credit.map((c) => c.name + (c.joinphrase ?? '')).join('')
}

async function fetchLabelReleases(label: (typeof LABELS)[number]): Promise<MbRelease[]> {
  const releases: MbRelease[] = []
  let offset = 0
  for (;;) {
    const url =
      `${MB_ROOT}/release?label=${label.mbid}&limit=${PAGE_SIZE}&offset=${offset}` +
      `&inc=release-groups+artist-credits+labels&fmt=json`
    const page = (await mbFetch(url)) as { 'release-count': number; releases: MbRelease[] }
    releases.push(...page.releases)
    offset += PAGE_SIZE
    console.log(`  ${label.name}: ${Math.min(offset, page['release-count'])}/${page['release-count']}`)
    if (offset >= page['release-count']) break
  }
  return releases
}

function dedupeIntoEntries(releases: MbRelease[], label: (typeof LABELS)[number]): CatalogEntry[] {
  const byGroup = new Map<string, CatalogEntry>()
  for (const release of releases) {
    const rg = release['release-group']
    const id = rg?.id ?? release.id
    const date = rg?.['first-release-date'] || release.date || ''
    const catno =
      release['label-info']?.find((li) => li.label?.id === label.mbid)?.['catalog-number'] ?? null
    const credit = release['artist-credit']
    const entry: CatalogEntry = {
      id,
      title: release.title,
      artist: renderArtistCredit(credit),
      artistIds: credit?.map((c) => c.artist.id) ?? [],
      artists: credit?.map((c) => c.artist.name) ?? [],
      label: label.key,
      date,
      year: date ? Number(date.slice(0, 4)) : null,
      catno,
      type: rg?.['primary-type'] ?? 'Other',
      secondaryTypes: rg?.['secondary-types'] ?? [],
    }
    const existing = byGroup.get(id)
    // Keep the earliest-dated release of a group; prefer one with a catalog number.
    if (
      !existing ||
      (entry.date && (!existing.date || entry.date < existing.date)) ||
      (entry.date === existing.date && !existing.catno && entry.catno)
    ) {
      byGroup.set(id, { ...entry, catno: entry.catno ?? existing?.catno ?? null })
    }
  }
  return [...byGroup.values()]
}

async function main() {
  const all: CatalogEntry[] = []
  for (const label of LABELS) {
    console.log(`Fetching ${label.name} releases…`)
    const releases = await fetchLabelReleases(label)
    const entries = dedupeIntoEntries(releases, label)
    console.log(`  → ${releases.length} releases, ${entries.length} unique release-groups`)
    all.push(...entries)
  }

  // A release-group can appear under multiple Anjuna labels; keep the first (label order above).
  const seen = new Set<string>()
  const catalog = all.filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)))
  catalog.sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'))

  const outDir = path.resolve(import.meta.dirname, '../public/data')
  await mkdir(outDir, { recursive: true })
  const outPath = path.join(outDir, 'catalog.json')

  // Only rewrite when the releases themselves changed. The weekly refresh job
  // keys off `git diff`, so a fresh timestamp on identical data would produce
  // an empty commit and a pointless redeploy every week.
  const next = JSON.stringify(catalog)
  const previous = await readFile(outPath, 'utf8').catch(() => null)
  if (previous) {
    try {
      const parsed = JSON.parse(previous) as { releases: CatalogEntry[] }
      if (JSON.stringify(parsed.releases) === next) {
        console.log(`No change — ${catalog.length} entries already current.`)
        return
      }
    } catch {
      // Unreadable existing file: fall through and overwrite it.
    }
  }

  await writeFile(
    outPath,
    JSON.stringify({ generatedAt: new Date().toISOString(), releases: catalog }, null, 1),
  )
  console.log(`Wrote ${catalog.length} entries to ${outPath}`)
}

await main()
