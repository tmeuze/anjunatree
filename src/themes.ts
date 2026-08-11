// Colour themes, named after the music.
//
// The three label colours are not decoration — they carry identity on the map,
// so every theme's triple is checked with the dataviz palette validator against
// that theme's own surface (all-pairs, since all three lanes are on screen at
// once). Current results, all PASS on lightness band, chroma floor, CVD
// separation, normal-vision floor, and 3:1 contrast:
//
//   dark themes   #3987e5 / #199e70 / #d95926   worst CVD ΔE 9.4, normal 20.9
//   sun-and-moon  #2a78d6 / #199e70 / #eb6834   worst CVD ΔE 8.4, normal 21.6
//
// If you change a label colour or a surface, re-run the validator before
// shipping it — see the "Themes" note in CONTRIBUTING.md.

export type ThemeId = 'black-room-boy' | 'sirens-of-the-sea' | 'flow-state' | 'sun-and-moon'

export interface ThemeColors {
  surface: string
  panel: string
  ink: string
  inkSecondary: string
  inkMuted: string
  hairline: string
  /** map chrome */
  gridline: string
  milestone: string
  constellation: string
  /** label identity */
  anjunabeats: string
  anjunadeep: string
  reflections: string
  /** ambient wash behind the map */
  glow: [string, string, string]
}

export interface Theme {
  id: ThemeId
  name: string
  blurb: string
  mode: 'dark' | 'light'
  colors: ThemeColors
  /**
   * The second stop of the fan's gradient (its first stop is always the
   * theme's Anjunadeep colour). Lets a theme's fan lean toward its own accent
   * — Flow State's violet, for instance — without hand-authoring three full
   * gradients per theme. Defaults to the Anjunabeats colour.
   */
  fanAccent?: string
}

const DARK_LABELS = {
  anjunabeats: '#3987e5',
  anjunadeep: '#199e70',
  reflections: '#d95926',
}

export const THEMES: Theme[] = [
  {
    id: 'black-room-boy',
    name: 'Black Room Boy',
    blurb: 'Group Therapy, 2011 — the default deep dark.',
    mode: 'dark',
    colors: {
      surface: '#0b0d12',
      panel: '#12151d',
      ink: '#e6e8ee',
      inkSecondary: '#9aa0ae',
      inkMuted: '#898781',
      hairline: 'rgba(255, 255, 255, 0.08)',
      gridline: 'rgba(255, 255, 255, 0.055)',
      milestone: '230, 200, 140',
      constellation: '230, 232, 238',
      ...DARK_LABELS,
      glow: ['rgba(57,135,229,0.09)', 'rgba(25,158,112,0.07)', 'rgba(217,89,38,0.05)'],
    },
  },
  {
    id: 'sirens-of-the-sea',
    name: 'Sirens of the Sea',
    blurb: 'OceanLab, 2008 — deep water blues.',
    mode: 'dark',
    colors: {
      surface: '#061319',
      panel: '#0c1e26',
      ink: '#dfeaee',
      inkSecondary: '#93a8b0',
      inkMuted: '#7d9099',
      hairline: 'rgba(255, 255, 255, 0.09)',
      gridline: 'rgba(255, 255, 255, 0.06)',
      milestone: '224, 205, 150',
      constellation: '223, 234, 238',
      ...DARK_LABELS,
      glow: ['rgba(57,135,229,0.12)', 'rgba(25,158,112,0.09)', 'rgba(217,89,38,0.04)'],
    },
  },
  {
    id: 'flow-state',
    name: 'Flow State',
    blurb: 'Above & Beyond, 2019 — the ambient turn.',
    mode: 'dark',
    colors: {
      surface: '#100e18',
      panel: '#191627',
      ink: '#e7e4f0',
      inkSecondary: '#a19bb5',
      inkMuted: '#8b85a0',
      hairline: 'rgba(255, 255, 255, 0.08)',
      gridline: 'rgba(255, 255, 255, 0.05)',
      milestone: '226, 202, 152',
      constellation: '231, 228, 240',
      ...DARK_LABELS,
      glow: ['rgba(57,135,229,0.10)', 'rgba(144,133,233,0.08)', 'rgba(217,89,38,0.05)'],
    },
    fanAccent: '#9085e9',
  },
  {
    id: 'sun-and-moon',
    name: 'Sun & Moon',
    blurb: 'Group Therapy, 2011 — daylight.',
    mode: 'light',
    colors: {
      surface: '#fbfaf7',
      panel: '#ffffff',
      ink: '#14161a',
      inkSecondary: '#52514e',
      inkMuted: '#6b6a66',
      hairline: 'rgba(11, 11, 11, 0.12)',
      gridline: 'rgba(11, 11, 11, 0.07)',
      milestone: '138, 106, 31',
      constellation: '20, 22, 26',
      anjunabeats: '#2a78d6',
      anjunadeep: '#199e70',
      reflections: '#eb6834',
      glow: ['rgba(42,120,214,0.07)', 'rgba(25,158,112,0.06)', 'rgba(235,104,52,0.05)'],
    },
  },
]

export const DEFAULT_THEME: ThemeId = 'black-room-boy'

export const getTheme = (id: ThemeId): Theme =>
  THEMES.find((t) => t.id === id) ?? THEMES[0]

/** Push a theme's colours onto :root as CSS custom properties. */
export function applyTheme(theme: Theme): void {
  const r = document.documentElement
  const c = theme.colors
  r.style.setProperty('--surface', c.surface)
  r.style.setProperty('--panel', c.panel)
  r.style.setProperty('--ink', c.ink)
  r.style.setProperty('--ink-secondary', c.inkSecondary)
  r.style.setProperty('--ink-muted', c.inkMuted)
  r.style.setProperty('--hairline', c.hairline)
  r.style.setProperty('--label-anjunabeats', c.anjunabeats)
  r.style.setProperty('--label-anjunadeep', c.anjunadeep)
  r.style.setProperty('--label-reflections', c.reflections)
  r.style.setProperty('--glow-1', c.glow[0])
  r.style.setProperty('--glow-2', c.glow[1])
  r.style.setProperty('--glow-3', c.glow[2])

  // Brandmark gradients, derived from this theme's own tokens rather than
  // hand-authored per theme: structure fades dim-to-solid ink, the canopy
  // sweeps across all three label colours (it's the whole catalogue in
  // miniature), and the fan runs Anjunadeep into the theme's accent.
  r.style.setProperty('--mark-structure-1', c.inkMuted)
  r.style.setProperty('--mark-structure-2', c.ink)
  r.style.setProperty('--mark-canopy-1', c.anjunabeats)
  r.style.setProperty('--mark-canopy-2', c.anjunadeep)
  r.style.setProperty('--mark-canopy-3', c.reflections)
  r.style.setProperty('--mark-fan-1', c.anjunadeep)
  r.style.setProperty('--mark-fan-2', theme.fanAccent ?? c.anjunabeats)

  r.dataset.themeMode = theme.mode
  r.style.colorScheme = theme.mode

  // <TreeMark>'s gradients resolve these vars in JS rather than via SVG
  // `stop-color: var(...)` — WebKit doesn't reliably repaint that combination,
  // which was rendering the trunk and timeline as flat black in Safari. See
  // Brand.tsx.
  window.dispatchEvent(new Event('anjunatree:theme-changed'))
}
