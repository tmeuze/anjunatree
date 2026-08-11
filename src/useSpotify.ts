import { useCallback, useEffect, useRef, useState } from 'react'
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
  useEffect(() => {
    if (!session || needsReconnect || !premium || playerRef.current || connecting) return
    let cancelled = false
    setConnecting(true)
    setError(null)

    connectPlayer(
      // Always hand the SDK a live token; it outlives the one we started with.
      async () => (await spotify.validSession())?.accessToken ?? null,
      (s) => !cancelled && setPlayback(s),
      (m) => !cancelled && setError(m),
    )
      .then((p) => {
        if (cancelled) {
          p.disconnect()
          return
        }
        playerRef.current = p
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => !cancelled && setConnecting(false))

    return () => {
      cancelled = true
    }
  }, [session, needsReconnect, premium, connecting])

  // Tear the player down on sign-out so it can't keep holding the device.
  useEffect(() => {
    if (session) return
    playerRef.current?.disconnect()
    playerRef.current = null
    setPlayback(null)
  }, [session])

  const canPlayFull = Boolean(session && !needsReconnect && premium && playerRef.current)

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
