// A short, human-readable history — not a mirror of every commit. Add an
// entry here for anything a listener would actually notice; leave refactors
// and internal fixes out. CHANGELOG.md at the repo root carries the fuller,
// developer-facing version.
//
// `APP_VERSION` is a plain incrementing marker, not semver — it only has to
// change when there's something worth telling a returning visitor about.
// Bump it alongside adding an entry here; see useUpdateFlow.ts for how it's
// used to decide whether to show the changelog automatically.

export const APP_VERSION = '2026.08.11'

export interface ChangelogEntry {
  version: string
  date: string
  title: string
  items: string[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '2026.08.11',
    date: '11 August 2026',
    title: 'Full tracks, and a proper player',
    items: [
      'Connect Spotify Premium and releases play in full, not just previews',
      'The player is now front and centre, with real play/pause, mute and stop controls',
      'The AnjunaTree mark got its real artwork — a palm fan in your theme’s own colours',
      'Fixed previews occasionally failing to load on iPhone',
    ],
  },
  {
    version: '2026.08.10',
    date: '10 August 2026',
    title: 'Personalise it',
    items: [
      'Four themes named after the music, plus text size and accessibility options',
      'Install AnjunaTree as an app — it works offline once installed',
      'A running feed of the newest releases, with what’s announced but not out yet',
    ],
  },
  {
    version: '2026.08.06',
    date: '6 August 2026',
    title: 'Follow an artist',
    items: [
      'Selecting a release traces that artist’s whole run across the map',
      'Radio mode: press play and it walks the catalogue for you',
      'A second map view arranges releases by genre instead of by label',
    ],
  },
  {
    version: '2026.08.04',
    date: '4 August 2026',
    title: 'AnjunaTree launches',
    items: [
      'Every Anjunabeats, Anjunadeep and Anjunachill release since 2000, on one map',
      'Click any release to hear a 30-second preview',
    ],
  },
]
