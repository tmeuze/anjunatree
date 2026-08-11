// Spotify Web Playback SDK — full-length tracks for Premium listeners.
//
// This is the one place AnjunaTree loads third-party code, and it only happens
// after the listener has explicitly connected their Spotify account. Nothing is
// fetched from Spotify for a visitor who never signs in.
//
// Premium is a hard requirement of the SDK itself: Spotify will grant the
// `streaming` scope to a free account but then refuse to create a player for
// it, so callers check `product === 'premium'` first and stay on previews
// otherwise.

const SDK_SRC = 'https://sdk.scdn.co/spotify-player.js'

export interface PlaybackState {
  paused: boolean
  positionMs: number
  durationMs: number
  trackName: string
  artistName: string
}

interface SpotifyPlayerLike {
  connect(): Promise<boolean>
  disconnect(): void
  addListener(event: string, cb: (payload: never) => void): void
  pause(): Promise<void>
  resume(): Promise<void>
  seek(ms: number): Promise<void>
  setVolume(v: number): Promise<void>
}

declare global {
  interface Window {
    Spotify?: {
      Player: new (opts: {
        name: string
        getOAuthToken: (cb: (token: string) => void) => void
        volume?: number
      }) => SpotifyPlayerLike
    }
    onSpotifyWebPlaybackSDKReady?: () => void
  }
}

let sdkPromise: Promise<void> | null = null

/** Inject the SDK once; resolves when Spotify says it's ready. */
function loadSdk(): Promise<void> {
  if (sdkPromise) return sdkPromise
  sdkPromise = new Promise<void>((resolve, reject) => {
    if (window.Spotify) {
      resolve()
      return
    }
    // The SDK calls this global itself once it has finished initialising.
    window.onSpotifyWebPlaybackSDKReady = () => resolve()
    const script = document.createElement('script')
    script.src = SDK_SRC
    script.async = true
    script.onerror = () => {
      sdkPromise = null
      reject(new Error('Could not load the Spotify player'))
    }
    document.head.appendChild(script)
  })
  return sdkPromise
}

export interface ConnectedPlayer {
  deviceId: string
  player: SpotifyPlayerLike
  disconnect: () => void
}

/**
 * Create and connect a player. `getToken` is called by the SDK whenever it
 * needs a fresh token, so it must return a *current* one — refreshing if
 * necessary — rather than a value captured once.
 */
export async function connectPlayer(
  getToken: () => Promise<string | null>,
  onState: (s: PlaybackState | null) => void,
  onError: (message: string) => void,
): Promise<ConnectedPlayer> {
  await loadSdk()
  if (!window.Spotify) throw new Error('Spotify player unavailable')

  const player = new window.Spotify.Player({
    name: 'AnjunaTree',
    getOAuthToken: (cb) => {
      getToken().then((t) => {
        if (t) cb(t)
      })
    },
    volume: 0.8,
  })

  for (const event of ['initialization_error', 'authentication_error', 'account_error']) {
    player.addListener(event, ((e: { message: string }) => {
      onError(
        event === 'account_error'
          ? 'Spotify playback needs a Premium account.'
          : e.message || 'Spotify playback failed to start.',
      )
    }) as (payload: never) => void)
  }

  player.addListener('player_state_changed', ((state: {
    paused: boolean
    position: number
    duration: number
    track_window: { current_track: { name: string; artists: { name: string }[] } }
  } | null) => {
    if (!state) {
      onState(null)
      return
    }
    const t = state.track_window.current_track
    onState({
      paused: state.paused,
      positionMs: state.position,
      durationMs: state.duration,
      trackName: t?.name ?? '',
      artistName: t?.artists?.map((a) => a.name).join(', ') ?? '',
    })
  }) as (payload: never) => void)

  const deviceId = await new Promise<string>((resolve, reject) => {
    player.addListener('ready', ((e: { device_id: string }) => resolve(e.device_id)) as (
      payload: never,
    ) => void)
    player.connect().then((ok) => {
      if (!ok) reject(new Error('Spotify refused the connection'))
    })
    setTimeout(() => reject(new Error('Spotify player timed out')), 15000)
  })

  return {
    deviceId,
    player,
    disconnect: () => player.disconnect(),
  }
}

/** Start playback of one track on our own device. */
export async function playUri(
  token: string,
  deviceId: string,
  uri: string,
): Promise<void> {
  const res = await fetch(
    `https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(deviceId)}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uris: [uri] }),
    },
  )
  // 202 means the device is still waking; the SDK retries on its own.
  if (!res.ok && res.status !== 202) {
    throw new Error(`Spotify would not start playback (${res.status})`)
  }
}
