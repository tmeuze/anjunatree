import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Tells the visitor when a newer build is waiting.
 *
 * The service worker used to update silently, which meant an installed copy
 * could keep serving a cached build for days without ever saying so — the
 * worst failure mode for a site that's still changing daily. Now the new
 * worker waits, this offers the refresh, and taking it activates the update
 * and reloads in one step.
 */
export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    // Look for a new build on launch and hourly after that, so a long-lived
    // installed tab still notices.
    onRegisteredSW(_url, registration) {
      if (!registration) return
      setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000)
    },
  })

  if (!needRefresh) return null

  return (
    <div className="update-cta" role="status" aria-live="polite">
      <span className="update-dot" aria-hidden="true" />
      <div className="install-text">
        <strong>A new version is ready</strong>
        <span>Refresh to get the latest map and fixes.</span>
      </div>
      <button className="set-button primary install-go" onClick={() => updateServiceWorker(true)}>
        Refresh
      </button>
      <button
        className="install-close"
        onClick={() => setNeedRefresh(false)}
        aria-label="Dismiss update notice"
      >
        ✕
      </button>
    </div>
  )
}
