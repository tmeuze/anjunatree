import { useEffect, useState } from 'react'
import { TreeMark } from './Brand'

// Chromium fires this so a site can offer its own install button. iOS Safari
// never does — there the only route is Share → Add to Home Screen, so we detect
// iOS and show instructions instead.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'anjunatree:install-dismissed'

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches ||
  // iOS Safari's non-standard flag
  (navigator as unknown as { standalone?: boolean }).standalone === true

const isIos = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  // iPadOS 13+ reports as Mac but has touch
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIos, setShowIos] = useState(false)
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === '1',
  )

  useEffect(() => {
    if (dismissed || isStandalone()) return

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)

    // Only nudge iOS users on a phone-sized screen, where installing helps most.
    if (isIos() && window.matchMedia('(max-width: 820px)').matches) setShowIos(true)

    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [dismissed])

  const close = () => {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  if (dismissed || (!deferred && !showIos)) return null

  return (
    <div className="install-cta" role="complementary">
      <TreeMark className="install-mark" size={30} />
      <div className="install-text">
        <strong>Install AnjunaTree</strong>
        <span>
          {deferred
            ? 'Add it to your home screen — full screen, and the map works offline.'
            : 'Tap Share, then “Add to Home Screen” — full screen, and the map works offline.'}
        </span>
      </div>
      {deferred && (
        <button
          className="set-button primary install-go"
          onClick={async () => {
            await deferred.prompt()
            await deferred.userChoice
            setDeferred(null)
            close()
          }}
        >
          Install
        </button>
      )}
      <button className="install-close" onClick={close} aria-label="Dismiss install prompt">
        ✕
      </button>
    </div>
  )
}
