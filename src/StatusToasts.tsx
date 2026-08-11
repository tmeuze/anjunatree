import { clearStatus, useStatuses } from './status'

/**
 * The app's single status corner. Sits above the player bar so it never covers
 * the transport, and stays out of the way of the map.
 */
export default function Status() {
  const messages = useStatuses()
  if (!messages.length) return null

  return (
    <div className="status-stack" role="status" aria-live="polite">
      {messages.map((m) => (
        <div key={m.key} className={`status-toast ${m.kind}`}>
          {m.kind === 'progress' && <span className="status-spinner" aria-hidden="true" />}
          <span className="status-text">{m.text}</span>
          {m.kind === 'error' && (
            <button
              className="install-close"
              onClick={() => clearStatus(m.key)}
              aria-label="Dismiss"
            >
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
