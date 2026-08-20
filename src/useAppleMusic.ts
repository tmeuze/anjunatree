import { useCallback, useEffect, useRef, useState } from 'react'
import { clearStatus, setStatus } from './status'
import { connectPlayer, findAndPlaySong } from './applePlayer'
import type { ConnectedPlayer, PlaybackState } from './applePlayer'

// Apple's side of this is much simpler than Spotify's: there's no OAuth
// redirect to complete and no access/refresh token pair to manage —
// MusicKit.configure() just needs the app's own developer token (minted
// offline, see scripts/apple-token.mjs), and authorize() handles sign-in
// entirely in an Apple-hosted popup, resolving once it's done. MusicKit
// remembers that authorization internally across reloads; there's nothing
// of our own to persist for it.
const DEV_TOKEN = (import.meta.env.VITE_APPLE_DEV_TOKEN as string | undefined) ?? ''

export const isConfigured = (): boolean => DEV_TOKEN.length > 0

// The one thing we do persist ourselves: whether this browser has connected
// before, so a returning listener doesn't have to click Connect again. This
// is deliberately NOT a token — just a local flag — since MusicKit already
// remembers the real authorization on its own. Keeping this separate from
// that also keeps the "nothing is fetched from Apple until you opt in" rule
// intact for a first-time visitor: only a browser that flips this flag ever
// causes the SDK to load unprompted.
const CONNECTED_FLAG = 'anjunatree:apple:connected'

export interface AppleMusicState {
  connected: boolean
  /** Connected, authorized, player attached — full tracks work. */
  canPlayFull: boolean
  connecting: boolean
  error: string | null
  playback: PlaybackState | null
  /** Resolve and play a full track. False means "couldn't — use the preview". */
  playFull: (artist: string, title: string) => Promise<boolean>
  pause: () => void
  resume: () => void
  setMuted: (muted: boolean) => void
  connect: () => void
  disconnect: () => void
}

export function useAppleMusic(): AppleMusicState {
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [playback, setPlayback] = useState<PlaybackState | null>(null)
  const playerRef = useRef<ConnectedPlayer | null>(null)
  const [playerReady, setPlayerReady] = useState(false)
  const lastVolumeRef = useRef(1)
  const attemptedRef = useRef(false)

  const connect = useCallback(() => {
    if (!DEV_TOKEN) {
      setError('Apple Music connection isn’t available yet.')
      return
    }
    if (playerRef.current) return
    setConnecting(true)
    setError(null)
    setStatus('apple-player', 'progress', 'Connecting Apple Music…')

    connectPlayer(
      DEV_TOKEN,
      (s) => setPlayback(s),
      () => {},
    )
      .then((p) => {
        playerRef.current = p
        setPlayerReady(true)
        setConnected(true)
        localStorage.setItem(CONNECTED_FLAG, '1')
        clearStatus('apple-player')
        setStatus('apple-ready', 'info', 'Apple Music connected — full tracks enabled.')
      })
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : String(e)
        setError(message)
        setStatus('apple-player', 'error', message)
      })
      .finally(() => setConnecting(false))
  }, [])

  // A returning, previously-connected listener reconnects automatically —
  // same experience Spotify gives from its own persisted session, just
  // driven by our own small local flag instead of a real token. See the
  // note on the Spotify saved-releases sync effect (useSpotify.ts) for why
  // this guard resets in its cleanup rather than staying latched: under
  // StrictMode's dev-only double-invoke, an unreset guard lets the first,
  // about-to-be-cancelled run claim it while the real second run sees it
  // already set and skips connecting entirely.
  useEffect(() => {
    if (attemptedRef.current) return
    if (localStorage.getItem(CONNECTED_FLAG) !== '1') return
    attemptedRef.current = true
    connect()
    return () => {
      attemptedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const disconnect = useCallback(() => {
    playerRef.current?.instance.unauthorize().catch(() => {})
    playerRef.current?.disconnect()
    playerRef.current = null
    attemptedRef.current = false
    setPlayerReady(false)
    setConnected(false)
    setPlayback(null)
    setError(null)
    localStorage.removeItem(CONNECTED_FLAG)
    clearStatus('apple-player')
  }, [])

  const canPlayFull = connected && playerReady

  const playFull = useCallback(async (artist: string, title: string): Promise<boolean> => {
    const player = playerRef.current
    if (!player) return false
    try {
      return await findAndPlaySong(player.instance, artist, title)
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Apple Music playback needs an active subscription.',
      )
      return false
    }
  }, [])

  const pause = useCallback(() => {
    playerRef.current?.instance.pause()
  }, [])

  const resume = useCallback(() => {
    playerRef.current?.instance.play().catch(() => {})
  }, [])

  const setMuted = useCallback((muted: boolean) => {
    const player = playerRef.current?.instance.player
    if (!player) return
    if (muted) {
      if (player.volume > 0) lastVolumeRef.current = player.volume
      player.volume = 0
    } else {
      player.volume = lastVolumeRef.current || 1
    }
  }, [])

  return {
    connected,
    canPlayFull,
    connecting,
    error,
    playback,
    playFull,
    pause,
    resume,
    setMuted,
    connect,
    disconnect,
  }
}
