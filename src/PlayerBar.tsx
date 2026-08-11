import { useEffect, useRef, useState } from 'react'
import { labelVar } from './data'
import type { SpotifyState } from './useSpotify'
import type { NowPlaying } from './types'

interface Props {
  nowPlaying: NowPlaying
  paused: boolean
  spotify: SpotifyState
  onPausedChange: (paused: boolean) => void
  onEnded: () => void
  onJumpTo: () => void
  onClose: () => void
}

/** Which source is actually making sound. */
type Mode = 'resolving' | 'spotify' | 'preview'

const fmt = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function PlayerBar({
  nowPlaying,
  paused,
  spotify,
  onPausedChange,
  onEnded,
  onJumpTo,
  onClose,
}: Props) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [mode, setMode] = useState<Mode>('preview')
  const { node, tracks, index, artworkUrl } = nowPlaying
  const track = tracks[index]

  // Pick a source for this track: Spotify if it can serve the real thing,
  // otherwise the 30-second preview. Re-runs whenever the track changes.
  useEffect(() => {
    let cancelled = false
    const audio = audioRef.current

    const playPreview = () => {
      if (cancelled || !audio || !track?.previewUrl) return
      setMode('preview')
      audio.src = track.previewUrl
      // Autoplay can be blocked before the first gesture; controls cover it.
      audio.play().catch(() => onPausedChange(true))
    }

    if (!spotify.canPlayFull) {
      playPreview()
      return () => {
        cancelled = true
      }
    }

    // Don't leave the preview playing underneath while we ask Spotify.
    if (audio) {
      audio.pause()
      audio.removeAttribute('src')
    }
    setMode('resolving')
    spotify
      .playFull(track?.artistName || node.rel.artist, track?.trackName ?? node.rel.title)
      .then((ok) => {
        if (cancelled) return
        if (ok) setMode('spotify')
        else playPreview()
      })
      .catch(() => !cancelled && playPreview())

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.rel.id, index, track?.previewUrl, spotify.canPlayFull])

  // Spotify reports a finished track as paused at position zero. Watch for that
  // so radio and album auto-advance behave the same on both sources.
  const wasPlaying = useRef(false)
  useEffect(() => {
    if (mode !== 'spotify') return
    const s = spotify.playback
    if (!s) return
    onPausedChange(s.paused)
    if (!s.paused) {
      wasPlaying.current = true
    } else if (wasPlaying.current && s.positionMs === 0) {
      wasPlaying.current = false
      onEnded()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spotify.playback, mode])

  const viaSpotify = mode === 'spotify'
  const state = spotify.playback

  return (
    <div className="player-bar">
      <button className="player-bar-art" onClick={onJumpTo} title="Show this release on the map">
        {artworkUrl ? (
          <img src={artworkUrl.replace('300x300', '120x120')} alt="" width={44} height={44} />
        ) : (
          <span className="player-bar-art-placeholder" style={{ background: labelVar(node.lane) }} />
        )}
      </button>

      <div className="player-bar-info">
        <div className="player-bar-title">
          {!paused && (
            <span className="eq" style={{ color: labelVar(node.lane) }} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          )}
          <span className="player-bar-title-text">{track?.trackName ?? node.rel.title}</span>
        </div>
        <div className="player-bar-meta">
          {track?.artistName || node.rel.artist} · {node.rel.title} ·{' '}
          {mode === 'resolving' ? (
            'finding full track…'
          ) : viaSpotify ? (
            <span className="source-badge full">Full track · Spotify</span>
          ) : (
            <span className="source-badge">30s preview</span>
          )}
        </div>
      </div>

      {viaSpotify ? (
        <div className="spotify-transport">
          <button
            className="transport-button"
            onClick={() => (state?.paused ? spotify.resume() : spotify.pause())}
            aria-label={state?.paused ? 'Play' : 'Pause'}
          >
            {state?.paused ? '▶' : '❚❚'}
          </button>
          <span className="transport-time">
            {fmt(state?.positionMs ?? 0)} / {fmt(state?.durationMs ?? 0)}
          </span>
          <span className="transport-track" aria-hidden="true">
            <span
              className="transport-fill"
              style={{
                width: state?.durationMs
                  ? `${Math.min(100, (state.positionMs / state.durationMs) * 100)}%`
                  : '0%',
              }}
            />
          </span>
        </div>
      ) : (
        <audio
          ref={audioRef}
          controls
          className="player-bar-audio"
          onPlay={() => onPausedChange(false)}
          onPause={() => onPausedChange(true)}
          onEnded={onEnded}
        />
      )}

      <button className="player-close" onClick={onClose} aria-label="Stop playback">
        ✕
      </button>
    </div>
  )
}
