import { useEffect, useRef, useState } from 'react'
import { REPO_URL } from './constants'

export type InfoTab = 'what' | 'how' | 'install' | 'about'

const TAB_TITLE: Record<InfoTab, string> = {
  what: 'What is this?',
  how: 'How to use it',
  install: 'Install as an app',
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
                    AnjunaTree charts the complete catalogue of{' '}
                    <strong>Anjunabeats</strong>, <strong>Anjunadeep</strong>, and{' '}
                    <strong>Anjunachill</strong> — close to 3,000 releases since 2000 —
                    as a single interactive map. Time runs left to right; every mark is
                    a release you can listen to.
                  </p>
                  <p>
                    <strong>Labels</strong> view groups releases into one stream per
                    label. <strong>Spectrum</strong> view re-arranges the same releases
                    along a genre axis, from uplifting trance down to ambient — a
                    curated approximation built from each label's centre of gravity and
                    hand-placed positions for the roster's defining artists.
                  </p>
                  <p>
                    Shapes carry meaning: ■ studio album, ◆ compilation or mix, ○ remix
                    package, ▲ EP, ● single. Gold diamonds along the axis mark label
                    milestones.
                  </p>
                  <h2>What you get by connecting an account</h2>
                  <p>
                    Everything works without signing in — every release plays a
                    30-second preview from Apple's public catalogue. Connecting{' '}
                    <strong>Spotify</strong> in Settings is what makes it personal:
                    full-length tracks instead of previews, your own saved releases lit
                    up across the timeline, and a way to turn any artist's constellation
                    into a playlist. Apple Music support is planned next.
                  </p>
                </>
              )}
              {tab === 'how' && (
                <>
                  <h2>Explore with your ears.</h2>
                  <ul>
                    <li>
                      <strong>Click any mark</strong> — the release opens with its full
                      track list, and a 30-second preview starts playing.
                    </li>
                    <li>
                      <strong>Constellations</strong> — selecting a release traces its
                      artist's whole journey across the map. Switch artists with the
                      chips in the panel.
                    </li>
                    <li>
                      <strong>Radio</strong> — turns the map into a station: it plays
                      through releases chronologically (or walks the current
                      constellation), one preview after another.
                    </li>
                    <li>
                      <strong>Latest</strong> — a running feed of what the labels have
                      just put out, newest first, plus what's announced but not out yet.
                    </li>
                    <li>
                      <strong>Scroll</strong> to zoom, <strong>drag</strong> to pan,{' '}
                      <strong>double-click</strong> to reset the view.
                    </li>
                    <li>
                      <strong>Search</strong> matches artists, titles, and catalogue
                      numbers (try “ANJ153”). Label chips toggle each label; the legend
                      counts follow your filters.
                    </li>
                    <li>
                      <strong>Settings</strong> — themes named after the music, text
                      size, high contrast, larger map marks, reduced motion, and Spotify
                      sign-in.
                    </li>
                    <li>
                      <strong>Share</strong> — the URL always encodes what you're
                      looking at; copy it to send someone your exact view, selection and
                      all.
                    </li>
                    <li>
                      <strong>Esc</strong> closes things.
                    </li>
                  </ul>
                </>
              )}
              {tab === 'install' && (
                <>
                  <h2>Keep it on your home screen.</h2>
                  <p>
                    AnjunaTree is a progressive web app, so it installs like a native
                    one — no app store, nothing to update by hand. Once installed it
                    opens full screen, and the whole map keeps working offline
                    (previews still need a connection, since the audio streams from
                    Apple).
                  </p>
                  <ul>
                    <li>
                      <strong>iPhone / iPad</strong> — in Safari, tap the Share button,
                      then <em>Add to Home Screen</em>.
                    </li>
                    <li>
                      <strong>Android</strong> — in Chrome, tap <em>Install</em> when
                      the banner appears, or use the ⋮ menu → <em>Install app</em>.
                    </li>
                    <li>
                      <strong>Desktop</strong> — in Chrome or Edge, click the install
                      icon at the right-hand end of the address bar.
                    </li>
                  </ul>
                  <p>
                    Nothing about you is stored on a server. Your theme, text size, and
                    accessibility preferences live in your own browser.
                  </p>
                </>
              )}
              {tab === 'about' && (
                <>
                  <h2>A passion project, built in the open.</h2>
                  <p>
                    AnjunaTree is an <strong>unofficial fan project</strong>, made for
                    the love of the music and nothing else. It is{' '}
                    <strong>
                      not affiliated with, endorsed by, sponsored by, or connected to
                    </strong>{' '}
                    Anjunabeats, Anjunadeep, Anjunachill, Involved Group, or any of the
                    artists whose work it maps. It is non-commercial: no ads, no
                    payments, no sponsorship.
                  </p>
                  <p>
                    All music, artwork, and label names belong to their respective
                    rights holders and are used here only to point listeners toward the
                    original releases. Nothing is hosted or redistributed by this site:
                    audio previews and artwork are served directly by Apple at the
                    moment you press play. If a rights holder would like something
                    changed or removed, please{' '}
                    <a href={`${REPO_URL}/issues`} target="_blank" rel="noreferrer noopener">
                      open an issue
                    </a>{' '}
                    and it will be dealt with promptly.
                  </p>
                  <p>
                    Catalogue data comes from{' '}
                    <a href="https://musicbrainz.org" target="_blank" rel="noreferrer noopener">
                      MusicBrainz
                    </a>{' '}
                    (open, CC0) and refreshes automatically each week. The genre
                    spectrum is editorial, not measured; argue with it, that's half the
                    fun.
                  </p>
                  <p>
                    The app is free, open-source software — a static, client-side web
                    app with no accounts, no tracking, and no server storing anything
                    about you.{' '}
                    <a href={REPO_URL} target="_blank" rel="noreferrer noopener">
                      Read or fork the source on GitHub
                    </a>
                    .
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
