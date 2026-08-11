import { useEffect, useState } from 'react'
import { APP_VERSION } from './changelog'

const KEY = 'anjunatree:last-seen-version'

export type AutoModal = 'welcome' | 'changelog' | null

/**
 * Decides what should open by itself, once, on load:
 *  - never visited before  → the welcome tab
 *  - visited before, but a newer version shipped since  → the changelog
 *    (inside the About tab, where it lives)
 *  - already caught up  → nothing
 *
 * `APP_VERSION` is a plain marker in changelog.ts, not a build hash — it only
 * changes when there's a changelog entry worth surfacing.
 */
export function useUpdateFlow(): { auto: AutoModal; dismiss: () => void } {
  const [auto, setAuto] = useState<AutoModal>(null)

  useEffect(() => {
    let lastSeen: string | null = null
    try {
      lastSeen = localStorage.getItem(KEY)
    } catch {
      return // storage unavailable — never auto-open rather than risk a loop
    }
    if (!lastSeen) setAuto('welcome')
    else if (lastSeen !== APP_VERSION) setAuto('changelog')
  }, [])

  const dismiss = () => {
    setAuto(null)
    try {
      localStorage.setItem(KEY, APP_VERSION)
    } catch {
      /* ignore */
    }
  }

  return { auto, dismiss }
}
