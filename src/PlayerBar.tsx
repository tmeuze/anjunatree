import { useEffect, useRef, useState } from 'react'
import { labelVar } from './data'
import { clearStatus, setStatus } from './status'
import { MuteIcon, PauseIcon, PlayIcon, StopIcon, VolumeIcon } from './Icons'
import type { SpotifyState } from './useSpotify'
import type { AppleMusicState } from './useAppleMusic'
import type { NowPlaying } from './types'

interface Props {
  nowPlaying: NowPlaying
  paused: boolean
  spotify: SpotifyState
  apple: AppleMusicState
  onPausedChange: (paused: boolean) => void
  onEnded: () => void
  onJumpTo: () => void
  onClose: () => void
}

/** Which source is actually making sound. Tried in this order — Spotify
 *  first, then Apple Music, then the preview — since a listener could in
 *  theory have both full-track providers connected at once. */
type Mode = 'resolving' | 'spotify' | 'apple' | 'preview'
const SOURCE_LABEL: Record<'spotify' | 'apple', string> = {
  spotify: 'Spotify',
  apple: 'Apple Music',
}

const fmt = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function PlayerBar({
  nowPlaying,
  paused,
  spotify,
  apple,
  onPausedChange,
  onEnded,
  onJumpTo,
  onClose,
}: Props) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [mode, setMode] = useState<Mode>('preview')
  const [muted, setMuted] = useState(false)
  // The preview <audio> element reports its own clock; a connected full-track
  // provider reports its own. One local mirror keeps the progress bar and
  // time readout identical no matter which is active.
  const [previewTime, setPreviewTime] = useState({ positionMs: 0, durationMs: 0 })
  const { node, tracks, index, artworkUrl } = nowPlaying
  const track = tracks[index]

  // Pick a source for this track: Spotify if it can serve the real thing,
  // else Apple Music, else the 30-second preview. Re-runs whenever the
  // track changes.
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

    const artistName = track?.artistName || node.rel.artist
    const trackName = track?.trackName ?? node.rel.title

    const tryProvider = (
      id: 'spotify' | 'apple',
      provider: { playFull: (artist: string, title: string) => Promise<boolean>; setMuted: (m: boolean) => void },
      next: () => void,
    ) => {
      setStatus('track-resolve', 'progress', `Finding the full track on ${SOURCE_LABEL[id]}…`)
      provider
        .playFull(artistName, trackName)
        .then((ok) => {
          if (cancelled) return
          clearStatus('track-resolve')
          if (ok) {
            setMode(id)
            provider.setMuted(muted)
          } else {
            next()
          }
        })
        .catch(() => {
          if (cancelled) return
          clearStatus('track-resolve')
          next()
        })
    }

    if (spotify.canPlayFull) {
      if (audio) {
        audio.pause()
        audio.removeAttribute('src')
      }
      setMode('resolving')
      tryProvider('spotify', spotify, () => {
        if (apple.canPlayFull) {
          tryProvider('apple', apple, () => {
            setStatus('track-fallback', 'info', 'Not on Spotify or Apple Music — playing the preview.')
            playPreview()
          })
        } else {
          setStatus('track-fallback', 'info', 'Not on Spotify — playing the preview.')
          playPreview()
        }
      })
    } else if (apple.canPlayFull) {
      if (audio) {
        audio.pause()
        audio.removeAttribute('src')
      }
      setMode('resolving')
      tryProvider('apple', apple, () => {
        setStatus('track-fallback', 'info', 'Not on Apple Music — playing the preview.')
        playPreview()
      })
    } else {
      playPreview()
    }

    return () => {
      cancelled = true
      clearStatus('track-resolve')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.rel.id, index, track?.previewUrl, spotify.canPlayFull, apple.canPlayFull])

  // A connected provider reports a finished track as paused at position
  // zero. Watch for that so radio and album auto-advance behave the same
  // regardless of source.
  const wasPlaying = useRef(false)
  const activeState = mode === 'spotify' ? spotify.playback : mode === 'apple' ? apple.playback : null
  useEffect(() => {
    if (mode !== 'spotify' && mode !== 'apple') return
    const s = activeState
    if (!s) return
    onPausedChange(s.paused)
    if (!s.paused) {
      wasPlaying.current = true
    } else if (wasPlaying.current && s.positionMs === 0) {
      wasPlaying.current = false
      onEnded()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeState, mode])

  const viaProvider = mode === 'spotify' || mode === 'apple'
  const activeSourceLabel = mode === 'spotify' || mode === 'apple' ? SOURCE_LABEL[mode] : null
  const state = activeState
  const positionMs = viaProvider ? state?.positionMs ?? 0 : previewTime.positionMs
  const durationMs = viaProvider ? state?.durationMs ?? 0 : previewTime.durationMs
  const progress = durationMs ? Math.min(100, (positionMs / durationMs) * 100) : 0

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    if (mode === 'spotify') spotify.setMuted(next)
    else if (mode === 'apple') apple.setMuted(next)
    else if (audioRef.current) audioRef.current.muted = next
  }

  const togglePlayPause = () => {
    if (mode === 'spotify' || mode === 'apple') {
      const provider = mode === 'spotify' ? spotify : apple
      if (state?.paused) provider.resume()
      else provider.pause()
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
            ) : viaProvider ? (
              <span className="source-badge full">Full track · {activeSourceLabel}</span>
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
