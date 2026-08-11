// Privacy-focused analytics — Umami, self-hosted.
//
// Off by default and only ever activates when both env vars below are set at
// build time, which only the maintainer can do (Umami is self-hosted — there
// is no shared default instance to point at). A visitor who never has this
// configured, or who is looking at a build without it, causes zero requests
// to any analytics endpoint; this stays true to the "no third-party requests
// until you opt in" posture the rest of the app holds to.
//
// Umami's own script does not use cookies and does not collect or store
// personally-identifying information — see https://umami.is/docs/faq — which
// is the whole reason it was chosen over anything cookie-based.

const SRC = import.meta.env.VITE_UMAMI_SRC
const WEBSITE_ID = import.meta.env.VITE_UMAMI_WEBSITE_ID

export function initAnalytics(): void {
  if (!SRC || !WEBSITE_ID) return
  const script = document.createElement('script')
  script.defer = true
  script.src = SRC
  script.dataset.websiteId = WEBSITE_ID
  // Umami respects Do Not Track by default when this is set; keep that on.
  script.dataset.doNotTrack = 'true'
  document.head.appendChild(script)
}
