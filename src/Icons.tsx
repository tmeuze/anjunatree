// A handful of hand-drawn stroke icons — no icon font or library, matching
// the project's dependency-free approach to iconography (see Brand.tsx).
// Each is 16x16, `currentColor` stroked, so it inherits the button's text
// colour and the text-size setting's effect on line-height for free.

interface IconProps {
  className?: string
}

const common = {
  width: 16,
  height: 16,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export function SearchIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <circle cx="7" cy="7" r="4.5" />
      <line x1="10.3" y1="10.3" x2="14" y2="14" />
    </svg>
  )
}

/** Three sliders, not a funnel — reads unambiguously as "adjust", which a
 * funnel glyph rarely does at 16px. */
export function SlidersIcon({ className }: IconProps) {
  return (
    <svg {...common} className={className}>
      <line x1="2" y1="4" x2="14" y2="4" />
      <circle cx="6" cy="4" r="1.6" fill="currentColor" stroke="none" />
      <line x1="2" y1="8" x2="14" y2="8" />
      <circle cx="10" cy="8" r="1.6" fill="currentColor" stroke="none" />
      <line x1="2" y1="12" x2="14" y2="12" />
      <circle cx="7.5" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  )
}
