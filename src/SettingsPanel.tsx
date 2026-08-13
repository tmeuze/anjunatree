import { FONT_SCALES } from './settings'
import type { Settings } from './settings'
import { THEMES } from './themes'
import type { ThemeId } from './themes'
import * as spotify from './spotify'
import type { SpotifyState } from './useSpotify'

interface Props {
  settings: Settings
  onChange: (s: Settings) => void
  spotify: SpotifyState
  /** Message from a failed sign-in redirect, if this load came back from one. */
  authError: string | null
  onClose: () => void
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="set-toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="set-toggle-text">
        <span className="set-toggle-label">{label}</span>
        <span className="set-hint">{hint}</span>
      </span>
    </label>
  )
}

export default function SettingsPanel({
  settings,
  onChange,
  spotify: sp,
  authError,
  onClose,
}: Props) {
  const configured = spotify.isConfigured()

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    onChange({ ...settings, [key]: value })

  return (
    <div className="info-overlay" onClick={onClose}>
      <aside
        className="settings"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Settings"
      >
        <div className="settings-head">
          <h2>Settings</h2>
          <button className="panel-close settings-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="settings-body">
          <section>
            <h3>Theme</h3>
            <p className="set-hint">
              Every palette is checked so the three label colours stay
              distinguishable — including for colour-blind viewers.
            </p>
            <div className="theme-grid">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  className={`theme-card${settings.theme === t.id ? ' on' : ''}`}
                  onClick={() => set('theme', t.id as ThemeId)}
                  aria-pressed={settings.theme === t.id}
                >
                  <span
                    className="theme-swatch"
                    style={{ background: t.colors.surface, borderColor: t.colors.hairline }}
                  >
                    <i style={{ background: t.colors.anjunabeats }} />
                    <i style={{ background: t.colors.anjunadeep }} />
                    <i style={{ background: t.colors.reflections }} />
                  </span>
                  <span className="theme-name">{t.name}</span>
                  <span className="set-hint">{t.blurb}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3>Text size</h3>
            <div className="seg">
              {FONT_SCALES.map((f) => (
                <button
                  key={f.id}
                  className={settings.fontScale === f.id ? 'on' : ''}
                  onClick={() => set('fontScale', f.id)}
                  aria-pressed={settings.fontScale === f.id}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3>Accessibility</h3>
            <Toggle
              label="High contrast"
              hint="Firmer text, stronger borders, and releases that aren't in your filter stay visible instead of fading out."
              checked={settings.highContrast}
              onChange={(v) => set('highContrast', v)}
            />
            <Toggle
              label="Larger map marks"
              hint="Draws every release bigger and easier to hit — useful on touch screens too."
              checked={settings.largeMarks}
              onChange={(v) => set('largeMarks', v)}
            />
            <Toggle
              label="Reduce motion"
              hint="Stops the animated view change, the pulsing equaliser, and other movement."
              checked={settings.reduceMotion}
              onChange={(v) => set('reduceMotion', v)}
            />
            <p className="set-hint">
              Release types are drawn as different shapes, not just colours, so the map
              is readable without relying on colour at all.
            </p>
          </section>

          <section>
            <h3>Spotify</h3>
            {sp.session ? (
              <>
                <p className="set-hint">
                  Connected{sp.profile ? ` as ${sp.profile.displayName}` : ''}
                  {sp.profile?.product ? ` · ${sp.profile.product}` : ''}.
                </p>

                {sp.needsReconnect ? (
                  <p className="set-error">
                    This sign-in predates full-track playback. Reconnect once to grant
                    the playback permission — nothing else changes.
                  </p>
                ) : sp.profile && sp.profile.product !== 'premium' ? (
                  <p className="set-hint">
                    Spotify only allows other apps to stream full tracks for Premium
                    accounts, so playback stays on 30-second previews. Everything else
                    works exactly the same.
                  </p>
                ) : sp.connecting ? (
                  <p className="set-hint">Starting the Spotify player…</p>
                ) : sp.canPlayFull ? (
                  <p className="set-hint">
                    <strong>Full-track playback is on.</strong> Releases now play in
                    full through Spotify; anything Spotify doesn&apos;t carry falls back
                    to a preview automatically.
                  </p>
                ) : null}

                {sp.error && <p className="set-error">{sp.error}</p>}

                <div className="set-buttons">
                  {sp.needsReconnect && (
                    <button
                      className="set-button primary"
                      onClick={() => spotify.beginLogin().catch(() => {})}
                    >
                      Reconnect Spotify
                    </button>
                  )}
                  <button className="set-button" onClick={sp.disconnect}>
                    Disconnect Spotify
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="set-hint">
                  AnjunaTree works fully without an account — every release plays a
                  30-second preview. Connecting Spotify Premium plays them in full:
                </p>
                <ul className="set-list">
                  <li>Full-length tracks instead of previews (needs Premium)</li>
                </ul>
                <button
                  className="set-button primary"
                  disabled={!configured}
                  onClick={() => spotify.beginLogin().catch(() => {})}
                >
                  Connect Spotify
                </button>
                {authError && <p className="set-error">{authError}</p>}
                {!configured && (
                  <p className="set-hint">Spotify connection isn&apos;t available yet.</p>
                )}
              </>
            )}
          </section>

          <p className="set-foot">
            Preferences are stored in this browser only. AnjunaTree has no accounts,
            no analytics, and no server to send them to.
          </p>
        </div>
      </aside>
    </div>
  )
}
