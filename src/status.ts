// One place for "the app is doing something" messages.
//
// Progress and failure used to be reported ad hoc — a word inside the player
// bar, a paragraph inside Settings, nothing at all elsewhere — so whether you
// found out depended on which panel you had open. Anything worth telling the
// listener now goes through here and surfaces in the same corner.
//
// Messages are keyed, so a long-running job can update or clear its own line
// without knowing anything about the others.

import { useSyncExternalStore } from 'react'

export type StatusKind = 'progress' | 'info' | 'error'

export interface StatusMessage {
  key: string
  kind: StatusKind
  text: string
}

let messages: StatusMessage[] = []
const listeners = new Set<() => void>()

function emit() {
  // A new array identity each time, so useSyncExternalStore sees the change.
  messages = [...messages]
  listeners.forEach((l) => l())
}

/** Add or replace the line for `key`. Errors linger; progress does not. */
export function setStatus(key: string, kind: StatusKind, text: string): void {
  const next = messages.filter((m) => m.key !== key)
  next.push({ key, kind, text })
  messages = next
  emit()
  if (kind === 'info') window.setTimeout(() => clearStatus(key), 4000)
}

export function clearStatus(key: string): void {
  if (!messages.some((m) => m.key === key)) return
  messages = messages.filter((m) => m.key !== key)
  emit()
}

export function useStatuses(): StatusMessage[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => messages,
    () => messages,
  )
}
