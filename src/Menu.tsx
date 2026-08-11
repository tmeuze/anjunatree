import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'

interface Props {
  /** Full label, shown when there's room. */
  label: string
  /** Leading glyph, always shown — this is all that survives on a narrow screen. */
  icon: ReactNode
  /** Small count/summary badge on the trigger, e.g. "2 of 3". */
  badge?: string
  title?: string
  align?: 'left' | 'right'
  children: (close: () => void) => ReactNode
}

/**
 * A trigger button with a popup beneath it. The header uses these so it can
 * collapse gracefully: the text label hides on narrow screens and the icon
 * carries the button, which keeps everything on one row instead of wrapping.
 */
export default function Menu({
  label,
  icon,
  badge,
  title,
  align = 'left',
  children,
}: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const id = useId()

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
      }
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  return (
    <div className="menu" ref={ref}>
      <button
        className={`menu-trigger${open ? ' on' : ''}`}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={id}
        title={title ?? label}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="menu-icon" aria-hidden="true">
          {icon}
        </span>
        <span className="menu-label">{label}</span>
        {badge && <span className="menu-badge">{badge}</span>}
      </button>
      {open && (
        <div className={`menu-pop${align === 'right' ? ' right' : ''}`} id={id} role="menu">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}
