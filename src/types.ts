import type { Shape } from './shapes'

export type LabelKey = 'anjunabeats' | 'anjunadeep' | 'reflections'

export type ViewKey = 'labels' | 'spectrum'

export interface CatalogRelease {
  id: string
  title: string
  artist: string
  artistIds: string[]
  artists: string[]
  label: string
  date: string
  year: number | null
  catno: string | null
  type: string
  secondaryTypes: string[]
}

export interface AlbumTrack {
  trackName: string
  artistName: string
  previewUrl: string | null
  durationMs: number | null
  discNumber: number
  trackNumber: number
}

/** What the persistent player bar is playing: a queue of tracks from one release. */
export interface NowPlaying {
  node: MapNode
  tracks: AlbumTrack[]
  index: number
  artworkUrl: string
  collectionName: string
}

export interface MapNode {
  rel: CatalogRelease
  lane: LabelKey
  time: number
  r: number
  shape: Shape
  spectrum: number
  /** lane-view position */
  lx: number
  ly: number
  /** spectrum-view position */
  sx: number
  sy: number
  /** scratch coordinates used by the force simulation */
  x: number
  y: number
}
