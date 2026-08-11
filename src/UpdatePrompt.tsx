import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Tells the visitor when a newer build is waiting.
 *
 * The service worker used to update silently, which meant an installed copy
 * could keep serving a cached build for days without ever saying so — the
 * worst failure mode for a site that's still changing daily. Now the new
 * worker waits, and this offers the refresh.
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

  /**
   * A genuinely cache-bypassing reload, not just `location.reload()` (whose
   * force-network-reload flag browsers removed years ago).
   *
   * `updateServiceWorker(false)` activates the new worker without letting the
   * plugin auto-reload — we wait for `controllerchange`, i.e. the new worker
   * has taken control and every fetch from here on is served from *its*
   * precache, then navigate with a cache-busting query so the HTML document
   * itself is guaranteed to come from the network too, not any disk or
   * bfcache copy. App.tsx strips that param on load so it never lingers in
   * the address bar.
   */
  const cachelessRefresh = () => {
    let done = false
    const reload = () => {
      if (done) return
      done = true
      const url = new URL(window.location.href)
      url.searchParams.set('_v', String(Date.now()))
      window.location.replace(url.toString())
    }
    navigator.serviceWorker?.addEventListener('controllerchange', reload, { once: true })
    updateServiceWorker(false)
    // Belt and braces: activation is normally near-instant, but if the
    // controllerchange event is ever missed, don't strand the visitor on
    // "update ready" forever.
    setTimeout(reload, 4000)
  }

  return (
    <div className="update-cta" role="status" aria-live="polite">
      <span className="update-dot" aria-hidden="true" />
      <div className="install-text">
        <strong>A new version is ready</strong>
        <span>Refresh to get the latest map and fixes.</span>
      </div>
      <button className="set-button primary install-go" onClick={cachelessRefresh}>
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
