import { useEffect, useRef, useState } from 'react'

export type InfoTab = 'what' | 'how' | 'about'

const TAB_TITLE: Record<InfoTab, string> = {
  what: 'What is this?',
  how: 'How to use it',
  about: 'About the project',
}

interface Props {
  tab: InfoTab | null
  onOpen: (tab: InfoTab) => void
  onClose: () => void
}

export default function Info({ tab, onOpen, onClose }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [menuOpen])

  return (
    <>
      <div className="info-menu" ref={menuRef}>
        <button
          className="info-button"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          ? <span className="info-button-label">Info</span>
        </button>
        {menuOpen && (
          <div className="info-dropdown" role="menu">
            {(Object.keys(TAB_TITLE) as InfoTab[]).map((t) => (
              <button
                key={t}
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  onOpen(t)
                }}
              >
                {TAB_TITLE[t]}
              </button>
            ))}
          </div>
        )}
      </div>

      {tab && (
        <div className="info-overlay" onClick={onClose}>
          <div className="info-modal" onClick={(e) => e.stopPropagation()}>
            <button className="panel-close" onClick={onClose} aria-label="Close">
              ✕
            </button>
            <div className="info-tabs">
              {(Object.keys(TAB_TITLE) as InfoTab[]).map((t) => (
                <button key={t} className={t === tab ? 'on' : ''} onClick={() => onOpen(t)}>
                  {TAB_TITLE[t]}
                </button>
              ))}
            </div>
            <div className="info-body">
              {tab === 'what' && (
                <>
                  <h2>Every Anjuna release, one map.</h2>
                  <p>
                    AnjunaTree charts the complete catalog of <strong>Anjunabeats</strong>,{' '}
                    <strong>Anjunadeep</strong>, and <strong>Anjunachill</strong> — about 2,750
                    releases since 2000 — as a single interactive map. Time runs left to right;
                    every mark is a release you can listen to.
                  </p>
                  <p>
                    <strong>Labels</strong> view groups releases into one stream per label.{' '}
                    <strong>Spectrum</strong> view re-arranges the same releases along a genre
                    axis, from uplifting trance down to ambient — a curated approximation built
                    from each label's center of gravity and hand-placed positions for the
                    roster's defining artists.
                  </p>
                  <p>
                    Shapes carry meaning: ■ studio album, ◆ compilation or mix, ○ remix
                    package, ▲ EP, ● single. Gold diamonds along the axis mark label
                    milestones.
                  </p>
                </>
              )}
              {tab === 'how' && (
                <>
                  <h2>Explore with your ears.</h2>
                  <ul>
                    <li>
                      <strong>Click any mark</strong> — the release opens with its full track
                      list, and a 30-second preview starts playing.
                    </li>
                    <li>
                      <strong>Constellations</strong> — selecting a release traces its artist's
                      whole journey across the map. Switch artists with the chips in the panel.
                    </li>
                    <li>
                      <strong>Radio</strong> — turns the map into a station: it plays through
                      releases chronologically (or walks the current constellation), one preview
                      after another.
                    </li>
                    <li>
                      <strong>Scroll</strong> to zoom, <strong>drag</strong> to pan,{' '}
                      <strong>double-click</strong> to reset the view.
                    </li>
                    <li>
                      <strong>Search</strong> matches artists, titles, and catalog numbers
                      (try “ANJ153”). Label chips toggle each label; the legend counts follow
                      your filters.
                    </li>
                    <li>
                      <strong>Share</strong> — the URL always encodes what you're looking at;
                      copy it to send someone your exact view, selection and all.
                    </li>
                    <li>
                      <strong>Esc</strong> closes things.
                    </li>
                  </ul>
                </>
              )}
              {tab === 'about' && (
                <>
                  <h2>A fan project, built in the open.</h2>
                  <p>
                    AnjunaTree is an unofficial, non-commercial fan project. It is not
                    affiliated with or endorsed by Anjunabeats, Anjunadeep, or Involved Group.
                    All artwork and audio remain the property of their rights holders.
                  </p>
                  <p>
                    Catalog data comes from{' '}
                    <a href="https://musicbrainz.org" target="_blank" rel="noreferrer">
                      MusicBrainz
                    </a>{' '}
                    (open, CC0). Previews and artwork are served by Apple's iTunes Search API at
                    listen time — nothing is redistributed. The genre spectrum is editorial,
                    not measured; argue with it, that's half the fun.
                  </p>
                  <p>
                    The app is free, open-source software: a static, client-side web app —
                    no accounts, no tracking, nothing stored about you. Full-length playback
                    via Spotify and Apple Music for subscribers is in the works.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
