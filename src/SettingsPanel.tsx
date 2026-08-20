import { useState } from 'react'
import { FONT_SCALES } from './settings'
import type { Settings } from './settings'
import * as spotify from './spotify'
import type { SpotifyState } from './useSpotify'

interface Props {
  settings: Settings
  onChange: (s: Settings) => void
  spotify: SpotifyState
  /** Message from a failed sign-in redirect, if this load came back from one. */
  authError: string | null
  onClose: () => void
  onExportImage: (opts: { transparent: boolean; watermark: boolean }) => void
}

/** "just now" / "12 min ago" / "3 hr ago" / "2 days ago" — coarse on purpose,
 * this is only ever describing a cache that's at most a day or so old. */
function timeAgo(ms: number): string {
  const mins = Math.round((Date.now() - ms) / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
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
  onExportImage,
}: Props) {
  const configured = spotify.isConfigured()
  const [transparentExport, setTransparentExport] = useState(false)
  const [watermarkExport, setWatermarkExport] = useState(true)

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
          <p className="set-hint">
            Theme is in the header now — the ◑ button, next to Filters.
          </p>

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
            <h3>Export</h3>
            <p className="set-hint">
              Saves exactly what the map currently shows — whatever view, theme,
              zoom and selection you&apos;re looking at.
            </p>
            <Toggle
              label="Transparent background"
              hint="Off fills in your current theme's background colour; on drops it, for pasting onto something else."
              checked={transparentExport}
              onChange={setTransparentExport}
            />
            <Toggle
              label="Include anjunatree.com watermark"
              hint="A small credit in the corner — on by default so a shared image still points back here."
              checked={watermarkExport}
              onChange={setWatermarkExport}
            />
            <div className="set-buttons">
              <button
                className="set-button primary"
                onClick={() =>
                  onExportImage({ transparent: transparentExport, watermark: watermarkExport })
                }
              >
                Save map as image
              </button>
            </div>
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
                    This sign-in predates full-track playback, saved-release matching,
                    and playlist export. Reconnect once to grant those — nothing else
                    changes.
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

                {!sp.needsReconnect && (
                  <>
                    <Toggle
                      label="Light up my saved releases"
                      hint={
                        sp.loadingLibrary && !sp.savedKeys
                          ? 'Checking your saved albums and tracks…'
                          : sp.savedKeys
                            ? `Rings ${sp.savedKeys.size.toLocaleString()} saved release${sp.savedKeys.size === 1 ? '' : 's'} you have that are also on this map.`
                            : 'Rings releases from your saved albums and tracks on the map.'
                      }
                      checked={settings.showSavedReleases}
                      onChange={(v) => set('showSavedReleases', v)}
                    />
                    {sp.savedKeysSyncedAt && (
                      <p className="set-hint set-sync-row">
                        {sp.loadingLibrary
                          ? 'Refreshing…'
                          : `Synced ${timeAgo(sp.savedKeysSyncedAt)}`}
                        {!sp.loadingLibrary && (
                          <button className="set-link" onClick={sp.refreshSavedKeys}>
                            Refresh now
                          </button>
                        )}
                      </p>
                    )}
                  </>
                )}

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
                  <li>Your saved releases lit up on the map, if you turn that on</li>
                  <li>Turn any artist's constellation into a playlist</li>
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
                {configured && (
                  <p className="set-hint">
                    Spotify caps apps like this one to a small number of approved accounts
                    — its public-access tier now requires being a registered business with
                    250k+ monthly users, which a non-commercial fan project can&apos;t
                    reach. If Connect doesn&apos;t work for you, that&apos;s why, not a
                    bug. Every release still plays a 30-second preview either way.
                  </p>
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
