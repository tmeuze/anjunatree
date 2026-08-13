import { SearchIcon } from './Icons'

interface Props {
  value: string
  onChange: (v: string) => void
}

/**
 * A modest, always-visible field — not an icon that expands into a huge bar,
 * not a full-width input either. The search glyph sits inside the field as a
 * fixed prefix rather than a separate toggle button, so there's one thing to
 * click, not two.
 */
export default function SearchBox({ value, onChange }: Props) {
  return (
    <div className="search-box">
      <SearchIcon className="search-icon" />
      <input
        className="search"
        type="search"
        placeholder="Search…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && value.trim()) onChange('')
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
