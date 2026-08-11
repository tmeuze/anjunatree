import { useEffect, useRef, useState } from 'react'

interface Props {
  value: string
  onChange: (v: string) => void
}

/**
 * Collapsed to an icon by default, at every viewport width — not just on
 * mobile. Clicking (or focusing) expands it inline; it collapses back once
 * it's empty and loses focus, so the header only spends width on the search
 * field while someone is actually using it.
 */
export default function SearchBox({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current?.contains(e.target as Node)) return
      if (!value.trim()) setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [open, value])

  return (
    <div className={`search-box${open ? ' open' : ''}`} ref={wrapRef}>
      <button
        className="search-toggle"
        onClick={() => setOpen(true)}
        aria-label="Search the catalogue"
        title="Search artist, title, or catalogue #"
      >
        <span aria-hidden="true">⌕</span>
      </button>
      <input
        ref={inputRef}
        className="search"
        type="search"
        placeholder="Search artist, title, or catalogue #…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            if (value.trim()) onChange('')
            else {
              setOpen(false)
              inputRef.current?.blur()
            }
          }
        }}
        onBlur={() => {
          if (!value.trim()) setOpen(false)
        }}
      />
      {value && (
        <button className="search-clear" onClick={() => onChange('')} aria-label="Clear search">
          ✕
        </button>
      )}
    </div>
  )
}
