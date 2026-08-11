import { useCallback, useEffect, useRef, useState } from 'react'
import { clearStatus, setStatus } from './status'
import * as spotify from './spotify'
import type { Profile, Session } from './spotify'
import { connectPlayer, playUri } from './spotifyPlayer'
import type { ConnectedPlayer, PlaybackState } from './spotifyPlayer'

export interface SpotifyState {
  session: Session | null
  profile: Profile | null
  /** Connected, Premium, scopes granted, player attached — full tracks work. */
  canPlayFull: boolean
  /** Signed in before the playback scopes existed; one reconnect fixes it. */
  needsReconnect: boolean
  connecting: boolean
  error: string | null
  playback: PlaybackState | null
  /** Resolve and play a full track. False means "couldn't — use the preview". */
  playFull: (artist: string, title: string) => Promise<boolean>
  pause: () => void
  resume: () => void
  disconnect: () => void
  refresh: () => void
}

export function useSpotify(): SpotifyState {
  const [session, setSession] = useState<Session | null>(() => spotify.loadSession())
  const [profile, setProfile] = useState<Profile | null>(null)
  const [playback, setPlayback] = useState<PlaybackState | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const playerRef = useRef<ConnectedPlayer | null>(null)
  // Mirrors playerRef as state: a ref alone would attach the player without
  // ever re-rendering, so canPlayFull would stay false and playback would
  // silently never switch away from previews.
  const [playerReady, setPlayerReady] = useState(false)

  const needsReconnect = session ? spotify.needsReconnect(session) : false
  const premium = profile?.product === 'premium'

  const refresh = useCallback(() => setSession(spotify.loadSession()), [])

  // Identify the account so we know whether playback is even possible.
  useEffect(() => {
    let alive = true
    if (!session) {
      setProfile(null)
      return
    }
    spotify.getProfile(session).then((p) => alive && setProfile(p))
    return () => {
      alive = false
    }
  }, [session])

  // Attach a player once — and only once — the account can actually use one.
  //
  // The guard is a ref, not the `connecting` state. Depending on state here
  // meant setConnecting(true) re-ran this effect, whose cleanup cancelled the
  // very attempt it had just started: the promise then resolved into a
  // cancelled closure, setConnecting(false) never ran, and the UI sat on
  // "connecting" forever. A ref keeps the guard out of the dependency list.
  const attemptedRef = useRef(false)
  useEffect(() => {
    if (!session || needsReconnect || !premium) return
    if (attemptedRef.current || playerRef.current) return
    attemptedRef.current = true

    let cancelled = false
    setConnecting(true)
    setError(null)
    setStatus('spotify-player', 'progress', 'Connecting the Spotify player…')

    connectPlayer(
      // Always hand the SDK a live token; it outlives the one we started with.
      async () => (await spotify.validSession())?.accessToken ?? null,
      (s) => !cancelled && setPlayback(s),
      (m) => {
        if (cancelled) return
        setError(m)
        setStatus('spotify-player', 'error', m)
      },
    )
      .then((p) => {
        if (cancelled) {
          p.disconnect()
          return
        }
        playerRef.current = p
        setPlayerReady(true)
        clearStatus('spotify-player')
        setStatus('spotify-ready', 'info', 'Spotify connected — full tracks enabled.')
      })
      .catch((e: unknown) => {
        if (cancelled) return
        const message = e instanceof Error ? e.message : String(e)
        setError(message)
        setStatus('spotify-player', 'error', message)
        // Let a later reconnect try again rather than latching the failure.
        attemptedRef.current = false
      })
      .finally(() => !cancelled && setConnecting(false))

    return () => {
      cancelled = true
    }
  }, [session, needsReconnect, premium])

  // Tear the player down on sign-out so it can't keep holding the device.
  useEffect(() => {
    if (session) return
    playerRef.current?.disconnect()
    playerRef.current = null
    attemptedRef.current = false
    setPlayerReady(false)
    setPlayback(null)
    clearStatus('spotify-player')
  }, [session])

  const canPlayFull = Boolean(session && !needsReconnect && premium && playerReady)

  const playFull = useCallback(
    async (artist: string, title: string): Promise<boolean> => {
      const player = playerRef.current
      const live = await spotify.validSession()
      if (!player || !live) return false
      try {
        const match = await spotify.findTrackUri(live, artist, title)
        if (!match) return false
        await playUri(live.accessToken, player.deviceId, match.uri)
        return true
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
        return false
      }
    },
    [],
  )

  const pause = useCallback(() => {
    playerRef.current?.player.pause().catch(() => {})
  }, [])

  const resume = useCallback(() => {
    playerRef.current?.player.resume().catch(() => {})
  }, [])

  const disconnect = useCallback(() => {
    playerRef.current?.disconnect()
    playerRef.current = null
    attemptedRef.current = false
    setPlayerReady(false)
    clearStatus('spotify-player')
    spotify.logout()
    setSession(null)
    setProfile(null)
    setPlayback(null)
    setError(null)
  }, [])

  return {
    session,
    profile,
    canPlayFull,
    needsReconnect,
    connecting,
    error,
    playback,
    playFull,
    pause,
    resume,
    disconnect,
    refresh,
  }
}
