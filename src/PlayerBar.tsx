import { useEffect, useRef } from 'react'
import { LABEL_META } from './data'
import type { NowPlaying } from './types'

interface Props {
  nowPlaying: NowPlaying
  paused: boolean
  onPausedChange: (paused: boolean) => void
  onEnded: () => void
  onJumpTo: () => void
  onClose: () => void
}

export default function PlayerBar({
  nowPlaying,
  paused,
  onPausedChange,
  onEnded,
  onJumpTo,
  onClose,
}: Props) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const { node, tracks, index, artworkUrl } = nowPlaying
  const track = tracks[index]

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !track?.previewUrl) return
    audio.src = track.previewUrl
    // Autoplay can be blocked before the first user gesture; controls cover it.
    audio.play().catch(() => onPausedChange(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.rel.id, index, track?.previewUrl])

  return (
    <div className="player-bar">
      <button className="player-bar-art" onClick={onJumpTo} title="Show this release on the map">
        {artworkUrl ? (
          <img src={artworkUrl.replace('300x300', '120x120')} alt="" width={44} height={44} />
        ) : (
          <span
            className="player-bar-art-placeholder"
            style={{ background: LABEL_META[node.lane].color }}
          />
        )}
      </button>
      <div className="player-bar-info">
        <div className="player-bar-title">
          {!paused && (
            <span className="eq" style={{ color: LABEL_META[node.lane].color }} aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          )}
          <span className="player-bar-title-text">{track?.trackName ?? node.rel.title}</span>
        </div>
        <div className="player-bar-meta">
          {track?.artistName || node.rel.artist} · {node.rel.title} · 30s preview
        </div>
      </div>
      <audio
        ref={audioRef}
        controls
        className="player-bar-audio"
        onPlay={() => onPausedChange(false)}
        onPause={() => onPausedChange(true)}
        onEnded={onEnded}
      />
      <button className="player-close" onClick={onClose} aria-label="Stop playback">
        ✕
      </button>
    </div>
  )
}
