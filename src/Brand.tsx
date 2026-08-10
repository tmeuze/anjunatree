// The AnjunaTree brand: a canopy of release-dots standing on a timeline axis —
// the same visual language the map itself uses.
//
// The source art (brand/brandmark/) ships two fixed-colour variants, one for
// light backgrounds and one for dark. Neither survives a theme switch, so this
// is a single mark that borrows the current theme instead: the axis in muted
// ink, the tree in whatever colour it inherits, and the crown in the label
// accent.

interface MarkProps {
  size?: number
  className?: string
}

export function TreeMark({ size = 26, className }: MarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      aria-hidden="true"
      className={className}
      focusable="false"
    >
      {/* the timeline the catalogue grows out of */}
      <g
        stroke="var(--ink-muted)"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.8"
      >
        <line x1="10" y1="86" x2="86" y2="86" />
        <line x1="26" y1="86" x2="26" y2="91" />
        <line x1="48" y1="86" x2="48" y2="91" />
        <line x1="70" y1="86" x2="70" y2="91" />
      </g>

      {/* trunk and canopy inherit from whatever they sit in */}
      <line
        x1="48"
        y1="86"
        x2="48"
        y2="58"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <g fill="currentColor">
        <circle cx="34" cy="52" r="3" />
        <circle cx="48" cy="50" r="4" />
        <circle cx="62" cy="52" r="3" />
        <circle cx="26" cy="41" r="2.6" />
        <circle cx="40" cy="40" r="4" />
        <circle cx="56" cy="40" r="3.6" />
        <circle cx="70" cy="41" r="2.6" />
        <circle cx="34" cy="30" r="3" />
        <circle cx="48" cy="29" r="2.6" />
        <circle cx="62" cy="30" r="3.6" />
      </g>

      {/* the newest release, always at the top */}
      <circle cx="48" cy="18" r="5" fill="var(--label-anjunadeep)" />
    </svg>
  )
}

/**
 * The wordmark: Jost in small caps, with "Tree" in bold. Rendered as live text
 * rather than an image so it scales with the text-size setting and stays
 * selectable and readable to screen readers.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={`wordmark${className ? ` ${className}` : ''}`}>
      Anjuna<b>Tree</b>
    </span>
  )
}
