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
  /** Match keys for every saved album/track's release, once loaded — null
   * while loading or signed out, so callers can tell "no matches yet" apart
   * from "haven't checked". */
  savedKeys: Set<string> | null
  loadingLibrary: boolean
  /** When savedKeys last came from Spotify — from cache if that's all
   * there's been time for, freshly fetched otherwise. Null until the first
   * successful sync ever completes. */
  savedKeysSyncedAt: number | null
  /** Force a fresh sync, bypassing the cached copy. */
  refreshSavedKeys: () => void
  /** Resolve and play a full track. False means "couldn't — use the preview". */
  playFull: (artist: string, title: string) => Promise<boolean>
  pause: () => void
  resume: () => void
  setMuted: (muted: boolean) => void
  disconnect: () => void
  refresh: () => void
  exportPlaylist: (
    name: string,
    description: string,
    releases: { artist: string; title: string }[],
  ) => Promise<{ url: string; matched: number; total: number }>
}

export function useSpotify(): SpotifyState {
  const [session, setSession] = useState<Session | null>(() => spotify.loadSession())
  const [profile, setProfile] = useState<Profile | null>(null)
  const [playback, setPlayback] = useState<PlaybackState | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedKeys, setSavedKeys] = useState<Set<string> | null>(null)
  const [savedKeysSyncedAt, setSavedKeysSyncedAt] = useState<number | null>(null)
  const [loadingLibrary, setLoadingLibrary] = useState(false)
  // Bumped by refreshSavedKeys() to force the sync effect below to skip the
  // cache and hit the network, without needing session/needsReconnect to
  // actually change.
  const [librarySyncNonce, setLibrarySyncNonce] = useState(0)
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

  // Sync saved releases so the map can light them up — stale-while-
  // revalidate against a localStorage cache (spotify.ts), not a fresh fetch
  // on every load. A cold fetch is the single most expensive thing this app
  // asks Spotify for (up to a couple hundred paginated requests for a real
  // library), so a reload shouldn't pay for it again just to show the same
  // answer as five minutes ago. Cached results show immediately; a
  // background refresh only actually hits the network once the cache is
  // more than a day old, or refreshSavedKeys() is called explicitly.
  //
  // No "already synced" ref guard here (unlike the player-attach effect
  // below) — deliberately: that pattern doesn't reset its guard on cleanup,
  // so under StrictMode's dev-only double-invoke (mount, cleanup, mount
  // again) the *second, real* run sees the guard already set by the first
  // and skips starting a new attempt, while the first attempt's own result
  // lands on a closure whose `alive` is already false. Net effect: it never
  // resolves, forever. Relying only on `alive` plus the dependency array —
  // same as the profile-fetch effect above — costs one harmless duplicate
  // request in dev and has no such failure mode.
  useEffect(() => {
    if (!session) {
      setSavedKeys(null)
      setSavedKeysSyncedAt(null)
      return
    }
    if (needsReconnect) return

    const forced = librarySyncNonce > 0
    const cached = forced ? null : spotify.loadCachedSavedKeys()
    if (cached) {
      setSavedKeys(cached.keys)
      setSavedKeysSyncedAt(cached.syncedAt)
      if (!cached.stale) return // fresh enough — no network call at all
    }
    // Something was already on screen (from cache, or from an earlier sync
    // this session) — this fetch is a quiet background refresh, not the
    // first-ever wait, whether or not *this particular* fetch bypassed the
    // cache read above to get here.
    const hadData = Boolean(cached) || savedKeys !== null

    let alive = true
    setLoadingLibrary(true)
    setStatus(
      'spotify-library',
      'progress',
      hadData ? 'Refreshing your saved releases…' : 'Checking your saved releases…',
    )
    spotify
      .fetchSavedReleaseKeys(session, (count) => {
        if (!alive || hadData || count < 50) return
        // Only worth showing once there's a real number to report — a big
        // library takes a real, visible number of seconds even fetched in
        // parallel, and "0 so far" for the first instant reads as no better
        // than the plain "Checking…" text. Skipped entirely when a cached
        // result is already on screen — that toast is quieter on purpose.
        setStatus('spotify-library', 'progress', `Checking your saved releases… (${count} so far)`)
      })
      .then((keys) => {
        if (!alive) return
        setSavedKeys(keys)
        const syncedAt = Date.now()
        setSavedKeysSyncedAt(syncedAt)
        spotify.saveCachedSavedKeys(keys)
        clearStatus('spotify-library')
      })
      .catch((e: unknown) => {
        if (!alive) return
        // A stale cache beats no data at all — leave it showing and just
        // report that the refresh itself didn't go through.
        setStatus(
          'spotify-library',
          'error',
          e instanceof Error ? e.message : 'Could not refresh your saved releases.',
        )
      })
      .finally(() => alive && setLoadingLibrary(false))
    return () => {
      alive = false
    }
  }, [session, needsReconnect, librarySyncNonce])

  const refreshSavedKeys = useCallback(() => setLibrarySyncNonce((n) => n + 1), [])

  // Attach a player once — and only once — the account can actually use one.
  //
  // The guard is a ref, not the `connecting` state. Depending on state here
  // meant setConnecting(true) re-ran this effect, whose cleanup cancelled the
  // very attempt it had just started: the promise then resolved into a
  // cancelled closure, setConnecting(false) never ran, and the UI sat on
  // "connecting" forever. A ref keeps the guard out of the dependency list.
  //
  // The cleanup resets the guard, too — found while chasing the same bug in
  // the saved-releases sync effect above: under StrictMode's dev-only
  // mount/cleanup/mount, an unreset guard lets the *first* (about-to-be-
  // cancelled) attempt claim the guard while the *second, real* run sees it
  // already set and skips connecting entirely — the player then never
  // attaches on a fresh session until something else changes the deps.
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
      attemptedRef.current = false
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

  const lastVolumeRef = useRef(0.8)
  const setMuted = useCallback((muted: boolean) => {
    const player = playerRef.current?.player
    if (!player) return
    if (muted) {
      player.getVolume().then((v) => {
        if (v > 0) lastVolumeRef.current = v
        player.setVolume(0).catch(() => {})
      })
    } else {
      player.setVolume(lastVolumeRef.current || 0.8).catch(() => {})
    }
  }, [])

  const disconnect = useCallback(() => {
    playerRef.current?.disconnect()
    playerRef.current = null
    attemptedRef.current = false
    setPlayerReady(false)
    clearStatus('spotify-player')
    spotify.logout() // also clears the cached saved-releases keys
    setSession(null)
    setProfile(null)
    setPlayback(null)
    setError(null)
    setLibrarySyncNonce(0)
  }, [])

  const exportPlaylist = useCallback(
    async (name: string, description: string, releases: { artist: string; title: string }[]) => {
      const live = await spotify.validSession()
      if (!live) throw new Error('Reconnect Spotify to export a playlist.')
      return spotify.exportPlaylist(live, name, description, releases)
    },
    [],
  )

  return {
    session,
    profile,
    canPlayFull,
    needsReconnect,
    connecting,
    error,
    playback,
    savedKeys,
    loadingLibrary,
    savedKeysSyncedAt,
    refreshSavedKeys,
    playFull,
    pause,
    resume,
    setMuted,
    disconnect,
    refresh,
    exportPlaylist,
  }
}
