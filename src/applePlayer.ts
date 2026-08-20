// Apple MusicKit JS — full-length tracks for Apple Music subscribers.
//
// Mirrors spotifyPlayer.ts's shape (load SDK once, connect, resolve+play a
// track) but Apple's auth model is simpler than Spotify's: there's no OAuth
// redirect to complete. `configure()` takes the app's own developer token
// (minted offline via scripts/apple-token.mjs — see docs/DEVELOPMENT.md),
// and `authorize()` opens Apple's own sign-in UI in place, resolving once
// the listener has signed in and MusicKit has confirmed a musicUserToken.
// MusicKit itself remembers that authorization across reloads — there's no
// token to store or refresh on our side, unlike Spotify's access/refresh
// pair.
//
// This is the one place AnjunaTree loads Apple's code, and — same posture
// as Spotify — it only happens once a listener has an Apple developer token
// configured (VITE_APPLE_DEV_TOKEN) and explicitly connects.
//
// API surface verified against the community-maintained `musickit-typescript`
// type definitions (github.com/wsmd/musickit-typescript) rather than guessed:
// Apple's own MusicKit JS reference is a JS-rendered page this project's
// tooling can't read. The one thing that couldn't be verified without a real,
// authorized session is the exact runtime shape `api.search()` resolves to —
// searchForSong() below handles the two shapes Apple's REST API and MusicKit
// JS's own examples document, and throws a clear, specific error if neither
// matches, rather than failing silently. Worth an actual live check the
// first time this runs against a real developer token and subscriber
// account.

const SDK_SRC = 'https://js-cdn.music.apple.com/musickit/v3/musickit.js'

export interface PlaybackState {
  paused: boolean
  positionMs: number
  durationMs: number
  trackName: string
  artistName: string
}

// Minimal shape of the global MusicKit namespace this file actually uses —
// not the full API surface, so a real MusicKit type-defs package could
// replace this later without touching call sites.
interface MusicKitPlayer {
  currentPlaybackTime: number
  currentPlaybackDuration: number
  playbackState: number
  nowPlayingItem: { title?: string; artistName?: string } | null
  volume: number
}

interface MusicKitInstanceLike {
  isAuthorized: boolean
  player: MusicKitPlayer
  api: {
    search: (
      term: string,
      parameters?: Record<string, unknown>,
    ) => Promise<Record<string, unknown>>
  }
  authorize(): Promise<string>
  unauthorize(): Promise<unknown>
  addEventListener(name: string, cb: () => void): void
  removeEventListener(name: string, cb: () => void): void
  setQueue(options: { song: string }): Promise<unknown>
  play(): Promise<unknown>
  pause(): void
  stop(): void
}

interface MusicKitNamespace {
  configure(config: {
    developerToken: string
    app: { name: string; build: string }
  }): MusicKitInstanceLike
  getInstance(): MusicKitInstanceLike
  Events: {
    playbackStateDidChange: string
    playbackTimeDidChange: string
    mediaItemDidChange: string
  }
  PlaybackStates: { none: number; playing: number; paused: number; stopped: number; ended: number }
}

declare global {
  interface Window {
    MusicKit?: MusicKitNamespace
  }
}

let sdkPromise: Promise<void> | null = null

/** Inject the SDK once; resolves on MusicKit's own 'musickitloaded' event. */
function loadSdk(): Promise<void> {
  if (sdkPromise) return sdkPromise
  sdkPromise = new Promise<void>((resolve, reject) => {
    if (window.MusicKit) {
      resolve()
      return
    }
    document.addEventListener('musickitloaded', () => resolve(), { once: true })
    const script = document.createElement('script')
    script.src = SDK_SRC
    script.async = true
    script.onerror = () => {
      sdkPromise = null
      reject(new Error('Could not load the Apple Music player'))
    }
    document.head.appendChild(script)
  })
  return sdkPromise
}

export interface ConnectedPlayer {
  instance: MusicKitInstanceLike
  disconnect: () => void
}

/**
 * Configure MusicKit, authorize the listener if they haven't been already
 * (MusicKit persists authorization across reloads on its own), and start
 * reporting playback state.
 */
export async function connectPlayer(
  developerToken: string,
  onState: (s: PlaybackState | null) => void,
  onError: (message: string) => void,
): Promise<ConnectedPlayer> {
  await loadSdk()
  const MusicKit = window.MusicKit
  if (!MusicKit) throw new Error('Apple Music player unavailable')

  const instance = MusicKit.configure({
    developerToken,
    app: { name: 'AnjunaTree', build: '1.0.0' },
  })

  if (!instance.isAuthorized) {
    try {
      await instance.authorize()
    } catch {
      throw new Error('Apple Music sign-in was cancelled or refused.')
    }
  }

  const updateState = () => {
    const item = instance.player.nowPlayingItem
    if (!item || instance.player.playbackState === MusicKit.PlaybackStates.none) {
      onState(null)
      return
    }
    onState({
      paused: instance.player.playbackState !== MusicKit.PlaybackStates.playing,
      positionMs: instance.player.currentPlaybackTime * 1000,
      durationMs: instance.player.currentPlaybackDuration * 1000,
      trackName: item.title ?? '',
      artistName: item.artistName ?? '',
    })
  }

  instance.addEventListener(MusicKit.Events.playbackStateDidChange, updateState)
  instance.addEventListener(MusicKit.Events.playbackTimeDidChange, updateState)
  instance.addEventListener(MusicKit.Events.mediaItemDidChange, updateState)

  // MusicKit has no dedicated error event in this API surface; playback
  // failures surface as a rejected setQueue()/play() call at the call site
  // instead (see findAndPlaySong below), same as Spotify's account_error
  // covers "not actually a subscriber" there.
  void onError

  return {
    instance,
    disconnect: () => {
      instance.removeEventListener(MusicKit.Events.playbackStateDidChange, updateState)
      instance.removeEventListener(MusicKit.Events.playbackTimeDidChange, updateState)
      instance.removeEventListener(MusicKit.Events.mediaItemDidChange, updateState)
      instance.stop()
    },
  }
}

/** Extract a flat array of song resources from api.search()'s response,
 *  whichever of the shapes Apple's docs and MusicKit JS examples show it
 *  can take. Throws instead of silently returning nothing so a genuine API
 *  shape change surfaces immediately rather than reading as "no results". */
function extractSongs(result: Record<string, unknown>): { id: string }[] {
  const songs = (result as { songs?: { data?: unknown } }).songs?.data
  if (Array.isArray(songs)) return songs as { id: string }[]
  const results = (result as { results?: { songs?: { data?: unknown } } }).results?.songs?.data
  if (Array.isArray(results)) return results as { id: string }[]
  if (Array.isArray(result)) return result as { id: string }[]
  throw new Error('Unexpected response shape from Apple Music search.')
}

/** Resolve a catalog song by artist/title and start playing it. */
export async function findAndPlaySong(
  instance: MusicKitInstanceLike,
  artist: string,
  title: string,
): Promise<boolean> {
  const term = `${artist} ${title}`
  const raw = await instance.api.search(term, { types: ['songs'], limit: 5 })
  const songs = extractSongs(raw)
  if (songs.length === 0) return false
  await instance.setQueue({ song: songs[0].id })
  await instance.play()
  return true
}
