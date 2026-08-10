import { useEffect, useMemo, useRef, useState } from 'react'
import { findRelease, lookupTracks } from './itunes'
import type { ReleaseMatch } from './itunes'
import { LABEL_META, labelVar } from './data'
import { SHAPE_LABEL } from './shapes'
import type { AlbumTrack, MapNode, NowPlaying } from './types'

export const VARIOUS_ARTISTS_MBID = '89ad4ac3-39f7-470e-963a-56509c546377'

interface Props {
  node: MapNode
  constellationId: string | null
  radio: boolean
  nowPlaying: NowPlaying | null
  playerPaused: boolean
  onPlay: (np: NowPlaying) => void
  onRadioNext: () => void
  onPickArtist: (artistId: string) => void
  onClose: () => void
}

type MatchState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'error' }
  | { status: 'ready'; match: ReleaseMatch }

const fmtDuration = (ms: number | null) => {
  if (!ms) return ''
  const s = Math.round(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function ReleasePanel({
  node,
  constellationId,
  radio,
  nowPlaying,
  playerPaused,
  onPlay,
  onRadioNext,
  onPickArtist,
  onClose,
}: Props) {
  const [match, setMatch] = useState<MatchState>({ status: 'loading' })
  const [tracks, setTracks] = useState<AlbumTrack[] | null>(null)
  const autoplayedFor = useRef<string | null>(null)
  const { rel } = node

  // Credited artists, deduped, for the constellation chips.
  const artists = useMemo(() => {
    const seen = new Set<string>()
    const out: { id: string; name: string }[] = []
    rel.artistIds.forEach((id, i) => {
      if (!seen.has(id)) {
        seen.add(id)
        out.push({ id, name: rel.artists[i] ?? rel.artist })
      }
    })
    return out
  }, [rel])

  useEffect(() => {
    let alive = true
    setMatch({ status: 'loading' })
    setTracks(null)
    findRelease(rel)
      .then(async (m) => {
        if (!alive) return
        if (!m) {
          setMatch({ status: 'missing' })
          return
        }
        setMatch({ status: 'ready', match: m })
        if (m.collectionId) {
          const list = await lookupTracks(m.collectionId).catch(() => null)
          if (!alive) return
          setTracks(list?.length ? list : m.fallbackTrack ? [m.fallbackTrack] : [])
        } else {
          setTracks(m.fallbackTrack ? [m.fallbackTrack] : [])
        }
      })
      .catch(() => alive && setMatch({ status: 'error' }))
    return () => {
      alive = false
    }
  }, [rel])

  // Selecting a release is intent to listen: hand its queue to the player
  // once, starting on the matched track when the fallback search found one.
  useEffect(() => {
    if (match.status !== 'ready' || !tracks?.length || autoplayedFor.current === rel.id) return
    const wanted = match.match.matchedTrackName
    let idx = wanted ? tracks.findIndex((t) => t.trackName === wanted && t.previewUrl) : -1
    if (idx < 0) idx = tracks.findIndex((t) => t.previewUrl)
    if (idx < 0) return
    autoplayedFor.current = rel.id
    onPlay({
      node,
      tracks,
      index: idx,
      artworkUrl: match.match.artworkUrl,
      collectionName: match.match.collectionName,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks, match])

  // Radio shouldn't stall on releases iTunes can't match — skip after a beat.
  useEffect(() => {
    const dead =
      match.status === 'missing' ||
      match.status === 'error' ||
      (match.status === 'ready' && tracks !== null && tracks.length === 0)
    if (!radio || !dead) return
    const timer = setTimeout(onRadioNext, 1800)
    return () => clearTimeout(timer)
  }, [radio, match, tracks, onRadioNext])

  const playRow = (i: number) => {
    if (match.status !== 'ready' || !tracks?.[i]?.previewUrl) return
    onPlay({
      node,
      tracks,
      index: i,
      artworkUrl: match.match.artworkUrl,
      collectionName: match.match.collectionName,
    })
  }

  const isCurrentRelease = nowPlaying?.node.rel.id === rel.id
  const art = match.status === 'ready' ? match.match.artworkUrl : ''

  return (
    <aside className="panel">
      <button className="panel-close" onClick={onClose} aria-label="Close panel">
        ✕
      </button>
      <div className="panel-hero">
        {art ? (
          <img className="panel-art" src={art} alt="" />
        ) : (
          <div
            className="panel-art panel-art-placeholder"
            style={{ background: labelVar(node.lane) }}
          />
        )}
        <div className="panel-title">{rel.title}</div>
        <div className="panel-artist">{rel.artist}</div>
        <div className="panel-meta">
          {[SHAPE_LABEL[node.shape], rel.year, rel.catno, LABEL_META[node.lane].name]
            .filter(Boolean)
            .join(' · ')}
        </div>
      </div>

      <div className="panel-section-label">Constellation</div>
      <div className="panel-chips">
        {artists.map((a) => (
          <button
            key={a.id}
            className={`artist-chip${a.id === constellationId ? ' on' : ''}`}
            disabled={a.id === VARIOUS_ARTISTS_MBID}
            title={
              a.id === VARIOUS_ARTISTS_MBID
                ? 'Various Artists — too many stars for one constellation'
                : `Trace ${a.name} across the map`
            }
            onClick={() => onPickArtist(a.id)}
          >
            {a.name}
          </button>
        ))}
      </div>

      <div className="panel-section-label">
        Tracks
        {tracks?.length ? ` · ${tracks.length}` : ''}
      </div>
      <div className="panel-tracks">
        {match.status === 'loading' && <div className="panel-note">Finding release…</div>}
        {match.status === 'missing' && (
          <div className="panel-note">No confident match on iTunes for this release.</div>
        )}
        {match.status === 'error' && <div className="panel-note">Lookup failed.</div>}
        {match.status === 'ready' && !tracks && <div className="panel-note">Loading tracks…</div>}
        {match.status === 'ready' && tracks?.length === 0 && (
          <div className="panel-note">Matched, but iTunes lists no playable tracks.</div>
        )}
        {tracks?.map((t, i) => (
          <button
            key={`${t.discNumber}-${t.trackNumber}-${i}`}
            className={`track-row${isCurrentRelease && nowPlaying?.index === i ? ' on' : ''}`}
            disabled={!t.previewUrl}
            onClick={() => playRow(i)}
          >
            <span className="track-num">
              {isCurrentRelease && nowPlaying?.index === i && !playerPaused ? (
                <span className="eq" style={{ color: labelVar(node.lane) }}>
                  <span />
                  <span />
                  <span />
                </span>
              ) : (
                t.trackNumber || i + 1
              )}
            </span>
            <span className="track-name">{t.trackName}</span>
            <span className="track-time">{fmtDuration(t.durationMs)}</span>
          </button>
        ))}
      </div>
      <div className="panel-foot">30-second previews · iTunes</div>
    </aside>
  )
}
