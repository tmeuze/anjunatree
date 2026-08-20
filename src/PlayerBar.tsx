import { useEffect, useRef, useState } from 'react'
import { labelVar } from './data'
import { clearStatus, setStatus } from './status'
import { MuteIcon, PauseIcon, PlayIcon, StopIcon, VolumeIcon } from './Icons'
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
  const [muted, setMuted] = useState(false)
  // The preview <audio> element reports its own clock; Spotify reports its own.
  // One local mirror keeps the progress bar and time readout identical either way.
  const [previewTime, setPreviewTime] = useState({ positionMs: 0, durationMs: 0 })
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
      audio.muted = muted
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
    setStatus('track-resolve', 'progress', 'Finding the full track on Spotify…')
    spotify
      .playFull(track?.artistName || node.rel.artist, track?.trackName ?? node.rel.title)
      .then((ok) => {
        if (cancelled) return
        clearStatus('track-resolve')
        if (ok) {
          setMode('spotify')
          spotify.setMuted(muted)
        } else {
          setStatus('track-fallback', 'info', 'Not on Spotify — playing the preview.')
          playPreview()
        }
      })
      .catch(() => {
        if (cancelled) return
        clearStatus('track-resolve')
        playPreview()
      })

    return () => {
      cancelled = true
      clearStatus('track-resolve')
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
  const positionMs = viaSpotify ? state?.positionMs ?? 0 : previewTime.positionMs
  const durationMs = viaSpotify ? state?.durationMs ?? 0 : previewTime.durationMs
  const progress = durationMs ? Math.min(100, (positionMs / durationMs) * 100) : 0

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    if (viaSpotify) spotify.setMuted(next)
    else if (audioRef.current) audioRef.current.muted = next
  }

  const togglePlayPause = () => {
    if (viaSpotify) {
      if (state?.paused) spotify.resume()
      else spotify.pause()
      return
    }
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) audio.play().catch(() => {})
    else audio.pause()
  }

  return (
    <div className="player-bar">
      <button className="player-bar-art" onClick={onJumpTo} title="Show this release on the map">
        {artworkUrl ? (
          <img src={artworkUrl.replace('300x300', '120x120')} alt="" width={56} height={56} />
        ) : (
          <span className="player-bar-art-placeholder" style={{ background: labelVar(node.lane) }} />
        )}
      </button>

      <div className="player-bar-body">
        <div className="player-bar-info">
          <span className="player-bar-title-text">{track?.trackName ?? node.rel.title}</span>
          <span className="player-bar-meta">
            {track?.artistName || node.rel.artist} · {node.rel.title} ·{' '}
            {mode === 'resolving' ? (
              'finding full track…'
            ) : viaSpotify ? (
              <span className="source-badge full">Full track · Spotify</span>
            ) : (
              <span className="source-badge">30s preview</span>
            )}
          </span>
        </div>

        <div className="transport-track" aria-hidden="true">
          <span className="transport-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="transport-times" aria-hidden="true">
          <span>{fmt(positionMs)}</span>
          <span>{fmt(durationMs)}</span>
        </div>
      </div>

      {/* Play/pause, mute, and stop are always the same three controls and the
          same three buttons regardless of which source is playing. */}
      <div className="transport-controls">
        <button
          className="transport-button primary"
          onClick={togglePlayPause}
          disabled={mode === 'resolving'}
          aria-label={paused ? 'Play' : 'Pause'}
          title={paused ? 'Play' : 'Pause'}
        >
          {paused ? <PlayIcon /> : <PauseIcon />}
        </button>
        <button
          className={`transport-button${muted ? ' active' : ''}`}
          onClick={toggleMute}
          aria-label={muted ? 'Unmute' : 'Mute'}
          title={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? <MuteIcon /> : <VolumeIcon />}
        </button>
        <button
          className="transport-button stop"
          onClick={onClose}
          aria-label="Stop playback"
          title="Stop"
        >
          <StopIcon />
        </button>
      </div>

      <audio
        ref={audioRef}
        hidden
        onPlay={() => onPausedChange(false)}
        onPause={() => onPausedChange(true)}
        onEnded={onEnded}
        onTimeUpdate={() => {
          // Read the live element off the ref rather than the synthetic
          // event's currentTarget: a timeupdate can still be in flight the
          // instant this element unmounts (a track/source switch), and
          // currentTarget going null there crashed the whole player.
          const a = audioRef.current
          if (a) setPreviewTime((p) => ({ ...p, positionMs: a.currentTime * 1000 }))
        }}
        onLoadedMetadata={() => {
          const a = audioRef.current
          if (a) setPreviewTime({ positionMs: 0, durationMs: a.duration * 1000 })
        }}
      />
    </div>
  )
}
