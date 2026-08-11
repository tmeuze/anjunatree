import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { TreeMark, Wordmark } from './Brand'
import Menu from './Menu'
import Info from './Info'
import type { InfoTab } from './Info'
import InstallPrompt from './InstallPrompt'
import UpdatePrompt from './UpdatePrompt'
import Latest from './Latest'
import MapCanvas from './MapCanvas'
import PlayerBar from './PlayerBar'
import ReleasePanel, { VARIOUS_ARTISTS_MBID } from './ReleasePanel'
import SettingsPanel from './SettingsPanel'
import ShapeLegend from './ShapeLegend'
import { LABEL_KEYS, LABEL_META, layoutCatalog, loadCatalog, labelVar } from './data'
import type { CatalogLayout } from './data'
import { applySettings, loadSettings, saveSettings, scaleOf } from './settings'
import type { Settings } from './settings'
import { applyTheme, getTheme } from './themes'
import * as spotify from './spotify'
import { LABEL_SITE_URL, REPO_URL } from './constants'
import type { LabelKey, MapNode, NowPlaying, ViewKey } from './types'

interface HashState {
  view: ViewKey
  query: string
  off: LabelKey[]
  release: string | null
  artist: string | null
}

function parseHash(): HashState {
  const p = new URLSearchParams(window.location.hash.slice(1))
  const view = p.get('v') === 'spectrum' ? 'spectrum' : 'labels'
  const off = (p.get('off') ?? '')
    .split(',')
    .filter((k): k is LabelKey => (LABEL_KEYS as string[]).includes(k))
  return {
    view,
    query: p.get('q') ?? '',
    off,
    release: p.get('r'),
    artist: p.get('a'),
  }
}

export default function App() {
  const initial = useRef(parseHash())
  const [layout, setLayout] = useState<CatalogLayout | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState(initial.current.query)
  const [view, setView] = useState<ViewKey>(initial.current.view)
  const [enabled, setEnabled] = useState<Set<LabelKey>>(
    new Set(LABEL_KEYS.filter((k) => !initial.current.off.includes(k))),
  )
  const [selected, setSelected] = useState<MapNode | null>(null)
  const [constellationId, setConstellationId] = useState<string | null>(null)
  const [radio, setRadio] = useState(false)
  const [infoTab, setInfoTab] = useState<InfoTab | null>(null)
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null)
  const [playerPaused, setPlayerPaused] = useState(false)
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [showSettings, setShowSettings] = useState(false)
  const [showLatest, setShowLatest] = useState(false)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)

  const theme = useMemo(() => getTheme(settings.theme), [settings.theme])

  // Preferences drive CSS custom properties; the canvas gets the values as props.
  useEffect(() => {
    applyTheme(theme)
    applySettings(settings)
    saveSettings(settings)
  }, [theme, settings])

  // If we came back from the Spotify consent screen, finish the exchange. A
  // failure here is nearly always a redirect-URI mismatch, so surface it in
  // Settings rather than silently doing nothing.
  useEffect(() => {
    spotify.completeLoginFromRedirect().catch((e: unknown) => {
      setAuthError(e instanceof Error ? e.message : String(e))
      setShowSettings(true)
    })
  }, [])

  // Selecting a release lights up its first credited artist's constellation.
  const selectNode = useCallback((n: MapNode | null) => {
    setSelected(n)
    setConstellationId(n?.rel.artistIds.find((id) => id !== VARIOUS_ARTISTS_MBID) ?? null)
    if (!n) setRadio(false)
  }, [])

  useEffect(() => {
    loadCatalog()
      .then(({ releases, generatedAt }) => {
        setLayout(layoutCatalog(releases))
        setGeneratedAt(generatedAt)
      })
      .catch((e) => setError(String(e)))
  }, [])

  // Restore the shared selection once the layout exists.
  useEffect(() => {
    if (!layout || !initial.current.release) return
    const { release, artist } = initial.current
    initial.current.release = null
    const node = layout.nodes.find((n) => n.rel.id === release)
    if (node) {
      setSelected(node)
      setConstellationId(
        artist && node.rel.artistIds.includes(artist)
          ? artist
          : node.rel.artistIds.find((id) => id !== VARIOUS_ARTISTS_MBID) ?? null,
      )
    }
  }, [layout])

  // Keep the URL sharable: it always encodes the current view.
  useEffect(() => {
    const p = new URLSearchParams()
    if (view !== 'labels') p.set('v', view)
    if (query.trim()) p.set('q', query.trim())
    const off = LABEL_KEYS.filter((k) => !enabled.has(k))
    if (off.length) p.set('off', off.join(','))
    if (selected) {
      p.set('r', selected.rel.id)
      if (constellationId) p.set('a', constellationId)
    }
    const hash = p.toString()
    history.replaceState(
      null,
      '',
      hash ? `#${hash}` : window.location.pathname + window.location.search,
    )
  }, [view, query, enabled, selected, constellationId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (showSettings) setShowSettings(false)
      else if (infoTab) setInfoTab(null)
      else if (showLatest) setShowLatest(false)
      else selectNode(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectNode, infoTab, showSettings, showLatest])

  const isActive = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (n: MapNode) => {
      if (!enabled.has(n.lane)) return false
      if (!q) return true
      return (
        n.rel.artist.toLowerCase().includes(q) ||
        n.rel.title.toLowerCase().includes(q) ||
        n.rel.catno?.toLowerCase().includes(q) ||
        n.rel.artists.some((a) => a.toLowerCase().includes(q))
      )
    }
  }, [query, enabled])

  const constellation = useMemo(() => {
    if (!layout || !constellationId) return []
    return layout.nodes
      .filter((n) => n.rel.artistIds.includes(constellationId))
      .sort((a, b) => a.time - b.time)
  }, [layout, constellationId])

  // Radio: after each release's preview, step to the next one — through the
  // current constellation if the selection is part of it, otherwise
  // chronologically through everything the filters allow.
  const radioNext = useCallback(() => {
    if (!layout || !selected) return
    const walking =
      constellation.length > 1 && constellation.some((n) => n.rel.id === selected.rel.id)
    const queue = walking
      ? constellation
      : [...layout.nodes.filter(isActive)].sort((a, b) => a.time - b.time)
    const i = queue.findIndex((n) => n.rel.id === selected.rel.id)
    const next = queue[i + 1] ?? queue[0]
    if (!next || next.rel.id === selected.rel.id) {
      setRadio(false)
      return
    }
    setSelected(next)
    if (!walking) setConstellationId(null)
  }, [layout, selected, constellation, isActive])

  // Track ended in the player bar: next track in the release, or — in radio —
  // the next release entirely.
  const handleTrackEnded = useCallback(() => {
    if (radio) {
      radioNext()
      return
    }
    setNowPlaying((np) => {
      if (!np) return np
      const next = np.tracks.findIndex((t, i) => i > np.index && t.previewUrl)
      return next >= 0 ? { ...np, index: next } : np
    })
  }, [radio, radioNext])

  const toggleRadio = useCallback(() => {
    if (radio) {
      setRadio(false)
      return
    }
    if (!layout) return
    setRadio(true)
    if (!selected) {
      const queue = [...layout.nodes.filter(isActive)].sort((a, b) => a.time - b.time)
      if (queue.length) {
        setSelected(queue[0])
        setConstellationId(null)
      }
    }
  }, [radio, layout, selected, isActive])

  const toggleLabel = useCallback((key: LabelKey) => {
    setEnabled((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const matchCount = useMemo(
    () => (layout ? layout.nodes.filter(isActive).length : 0),
    [layout, isActive],
  )

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <TreeMark className="brand-mark" size={28} />
          <h1>
            <Wordmark />
          </h1>
          <span className="brand-sub">
            the{' '}
            <a href={LABEL_SITE_URL} target="_blank" rel="noreferrer noopener">
              Anjuna
            </a>{' '}
            music catalogue, visualised.
          </span>
        </div>

        <input
          className="search"
          type="search"
          placeholder="Search artist, title, or catalogue #…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="header-controls">
          <div className="view-toggle" role="tablist" aria-label="Map view">
            <button
              role="tab"
              aria-selected={view === 'labels'}
              className={view === 'labels' ? 'on' : ''}
              onClick={() => setView('labels')}
            >
              Labels
            </button>
            <button
              role="tab"
              aria-selected={view === 'spectrum'}
              className={view === 'spectrum' ? 'on' : ''}
              onClick={() => setView('spectrum')}
            >
              Spectrum
            </button>
          </div>

          <button
            className={`menu-trigger${radio ? ' on accent' : ''}`}
            onClick={toggleRadio}
            title="Play through the map, one preview at a time"
          >
            <span className="menu-icon" aria-hidden="true">
              {radio ? '■' : '▸'}
            </span>
            <span className="menu-label">Radio</span>
          </button>

          <button
            className={`menu-trigger${showLatest ? ' on' : ''}`}
            onClick={() => setShowLatest((v) => !v)}
            aria-pressed={showLatest}
            title="What's new on the labels"
          >
            <span className="menu-icon" aria-hidden="true">
              ✦
            </span>
            <span className="menu-label">Latest</span>
          </button>

          <Menu
            label="Filters"
            icon="◑"
            title="Choose which labels are shown"
            badge={enabled.size < LABEL_KEYS.length ? `${enabled.size}/${LABEL_KEYS.length}` : undefined}
          >
            {() => (
              <>
                <div className="menu-heading">Labels</div>
                {LABEL_KEYS.map((key) => (
                  <label key={key} className="menu-check">
                    <input
                      type="checkbox"
                      checked={enabled.has(key)}
                      onChange={() => toggleLabel(key)}
                    />
                    <span className="legend-dot" style={{ background: labelVar(key) }} />
                    <span className="menu-check-label">{LABEL_META[key].name}</span>
                  </label>
                ))}
                <div className="menu-foot">
                  Artist-run family labels — This Never Happened, Odd One Out — will appear
                  here once they're ingested.
                </div>
              </>
            )}
          </Menu>

          <Info tab={infoTab} onOpen={setInfoTab} onClose={() => setInfoTab(null)} />

          <button
            className="menu-trigger"
            onClick={() => setShowSettings(true)}
            title="Themes, text size, accessibility, Spotify"
          >
            <span className="menu-icon" aria-hidden="true">
              ⚙
            </span>
            <span className="menu-label">Settings</span>
          </button>
        </div>

        {/* Below the breakpoint every control folds into here, so nothing is
            ever clipped off the end of the row. */}
        <div className="header-more">
          <Menu label="Menu" icon="⋯" align="right" title="Views, filters and settings">
            {(close) => (
              <>
                <div className="menu-heading">View</div>
                <button
                  className={`menu-item${view === 'labels' ? ' on' : ''}`}
                  onClick={() => {
                    setView('labels')
                    close()
                  }}
                >
                  Labels
                </button>
                <button
                  className={`menu-item${view === 'spectrum' ? ' on' : ''}`}
                  onClick={() => {
                    setView('spectrum')
                    close()
                  }}
                >
                  Spectrum
                </button>

                <div className="menu-heading">Listen</div>
                <button
                  className={`menu-item${radio ? ' on' : ''}`}
                  onClick={() => {
                    toggleRadio()
                    close()
                  }}
                >
                  {radio ? 'Stop radio' : 'Start radio'}
                </button>
                <button
                  className={`menu-item${showLatest ? ' on' : ''}`}
                  onClick={() => {
                    setShowLatest((v) => !v)
                    close()
                  }}
                >
                  Latest releases
                </button>

                <div className="menu-heading">Labels</div>
                {LABEL_KEYS.map((key) => (
                  <label key={key} className="menu-check">
                    <input
                      type="checkbox"
                      checked={enabled.has(key)}
                      onChange={() => toggleLabel(key)}
                    />
                    <span className="legend-dot" style={{ background: labelVar(key) }} />
                    <span className="menu-check-label">{LABEL_META[key].name}</span>
                  </label>
                ))}

                <div className="menu-heading">More</div>
                <button
                  className="menu-item"
                  onClick={() => {
                    setShowSettings(true)
                    close()
                  }}
                >
                  Settings
                </button>
                <button
                  className="menu-item"
                  onClick={() => {
                    setInfoTab('what')
                    close()
                  }}
                >
                  About AnjunaTree
                </button>
              </>
            )}
          </Menu>
        </div>

        <div className="count">
          {layout ? `${matchCount.toLocaleString()} releases` : 'Loading…'}
        </div>
      </header>

      {error && <div className="status">Failed to load catalogue: {error}</div>}
      {!error && !layout && (
        <div className="status">
          <div className="loading">
            <TreeMark className="loading-mark" size={26} />
            <span>Arranging the catalogue…</span>
          </div>
        </div>
      )}
      {layout && <ShapeLegend layout={layout} isActive={isActive} />}
      {layout && (
        <div className="content-row">
          {showLatest && (
            <Latest
              layout={layout}
              generatedAt={generatedAt}
              selectedId={selected?.rel.id ?? null}
              onSelect={selectNode}
              onClose={() => setShowLatest(false)}
            />
          )}
          <div className="map-wrap">
            <MapCanvas
              layout={layout}
              view={view}
              isActive={isActive}
              constellation={constellation}
              selectedId={selected?.rel.id ?? null}
              onSelect={selectNode}
              colors={theme.colors}
              fontScale={scaleOf(settings.fontScale)}
              highContrast={settings.highContrast}
              reduceMotion={settings.reduceMotion}
              largeMarks={settings.largeMarks}
            />
            {view === 'spectrum' && (
              <div className="spectrum-note">
                curated spectrum — label + artist, not per-track data
              </div>
            )}
          </div>
          {selected && (
            <ReleasePanel
              node={selected}
              constellationId={constellationId}
              radio={radio}
              nowPlaying={nowPlaying}
              playerPaused={playerPaused}
              onPlay={setNowPlaying}
              onRadioNext={radioNext}
              onPickArtist={setConstellationId}
              onClose={() => selectNode(null)}
            />
          )}
        </div>
      )}

      {nowPlaying && (
        <PlayerBar
          nowPlaying={nowPlaying}
          paused={playerPaused}
          onPausedChange={setPlayerPaused}
          onEnded={handleTrackEnded}
          onJumpTo={() => selectNode(nowPlaying.node)}
          onClose={() => {
            setNowPlaying(null)
            setRadio(false)
          }}
        />
      )}

      <footer className="site-footer">
        <span>
          A passion project by a fan. <strong>Not affiliated with</strong> Anjunabeats,
          Anjunadeep, Anjunachill, Involved Group, or any artist — and not endorsed by
          them. All music and artwork belong to their rights holders.
        </span>
        <span className="footer-links">
          <a href={REPO_URL} target="_blank" rel="noreferrer noopener">
            Source on GitHub
          </a>
          <button className="footer-link-button" onClick={() => setInfoTab('about')}>
            About
          </button>
        </span>
      </footer>

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onChange={setSettings}
          authError={authError}
          onClose={() => {
            setShowSettings(false)
            setAuthError(null)
          }}
        />
      )}
      <UpdatePrompt />
      <InstallPrompt />
    </div>
  )
}
