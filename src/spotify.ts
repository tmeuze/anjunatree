// Spotify sign-in via Authorization Code with PKCE.
//
// PKCE exists so browser apps need no client secret: we generate a random
// verifier, send only its SHA-256 hash to Spotify, and prove ownership by
// sending the verifier at token-exchange time. Nothing secret ships.
//
// Set VITE_SPOTIFY_CLIENT_ID in .env.local (or as a GitHub repository
// *variable* in CI). The redirect URI is this page's own URL — register it in
// the Spotify dashboard exactly as redirectUri() returns it, e.g.
//   http://127.0.0.1:5173/     (dev — Spotify rejects plain-http "localhost")
//   https://anjunatree.com/    (production)

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID ?? ''
const AUTH_HOST = 'https://accounts.spotify.com'
const API = 'https://api.spotify.com/v1'
const STORE = 'anjunatree:spotify'
const VERIFIER_KEY = 'anjunatree:spotify:verifier'
const STATE_KEY = 'anjunatree:spotify:state'

// `streaming` is what the Web Playback SDK requires, and it is Premium-only —
// Spotify will grant the scope to a free account but refuse to create a player
// for it, so the app checks `product` too and falls back to previews.
// Adding scopes invalidates tokens issued before them, hence needsReconnect().
const SCOPES = [
  'user-read-email',
  'user-read-private',
  'streaming',
  'user-read-playback-state',
  'user-modify-playback-state',
]

const PLAYBACK_SCOPE = 'streaming'

export interface Session {
  accessToken: string
  refreshToken: string | null
  expiresAt: number
  /** Scopes Spotify actually granted, so stale tokens can be spotted. */
  scope: string
}

/**
 * True when the stored session predates the playback scopes. The token still
 * works for reading, so this isn't an error — the user just has to reconnect
 * once before full tracks can play.
 */
export const needsReconnect = (s: Session): boolean =>
  !s.scope.split(' ').includes(PLAYBACK_SCOPE)

export interface Profile {
  displayName: string
  product: string | null
}

export const isConfigured = (): boolean => CLIENT_ID.length > 0

export const redirectUri = (): string => window.location.origin + window.location.pathname

function randomString(bytes = 64): string {
  const a = new Uint8Array(bytes)
  crypto.getRandomValues(a)
  return Array.from(a, (b) => ('0' + b.toString(16)).slice(-2)).join('')
}

const base64url = (buf: ArrayBuffer): string =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

async function challengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64url(digest)
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORE)
    if (!raw) return null
    const s = JSON.parse(raw) as Session
    if (!s.accessToken) return null
    // Sessions stored before scopes were tracked have no `scope` field.
    return { ...s, scope: s.scope ?? '' }
  } catch {
    return null
  }
}

function storeSession(s: Session | null): void {
  try {
    if (s) localStorage.setItem(STORE, JSON.stringify(s))
    else localStorage.removeItem(STORE)
  } catch {
    /* storage unavailable — the session just won't persist */
  }
}

export async function beginLogin(): Promise<void> {
  if (!isConfigured()) throw new Error('VITE_SPOTIFY_CLIENT_ID is not set')
  const verifier = randomString()
  const state = randomString(16)
  sessionStorage.setItem(VERIFIER_KEY, verifier)
  sessionStorage.setItem(STATE_KEY, state)
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUri(),
    code_challenge_method: 'S256',
    code_challenge: await challengeFor(verifier),
    state,
    scope: SCOPES.join(' '),
  })
  window.location.assign(`${AUTH_HOST}/authorize?${params}`)
}

/**
 * Complete the redirect if we came back from Spotify. Always strips the auth
 * params from the URL so a refresh can't replay a spent code.
 */
export class SpotifyAuthError extends Error {}

export async function completeLoginFromRedirect(): Promise<Session | null> {
  const url = new URL(window.location.href)
  const code = url.searchParams.get('code')
  const returnedState = url.searchParams.get('state')
  const error = url.searchParams.get('error')
  if (!code && !error) return null

  const clean = () => {
    url.searchParams.delete('code')
    url.searchParams.delete('state')
    url.searchParams.delete('error')
    history.replaceState(null, '', url.toString())
  }

  const verifier = sessionStorage.getItem(VERIFIER_KEY)
  const expectedState = sessionStorage.getItem(STATE_KEY)
  sessionStorage.removeItem(VERIFIER_KEY)
  sessionStorage.removeItem(STATE_KEY)
  clean()

  if (error) {
    throw new SpotifyAuthError(
      error === 'invalid_client'
        ? 'Spotify rejected the app. Check VITE_SPOTIFY_CLIENT_ID.'
        : `Spotify returned "${error}".`,
    )
  }
  if (!code) return null
  if (!verifier) {
    throw new SpotifyAuthError('Sign-in did not complete — the browser dropped the session.')
  }
  // Mismatched state means the redirect wasn't one we started.
  if (!expectedState || returnedState !== expectedState) {
    throw new SpotifyAuthError('Sign-in state did not match; ignoring this redirect.')
  }

  const res = await fetch(`${AUTH_HOST}/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri(),
      code_verifier: verifier,
    }),
  })
  if (!res.ok) {
    // Overwhelmingly this is redirect_uri mismatch: Spotify compares the URI
    // *exactly*, including the trailing slash.
    throw new SpotifyAuthError(
      `Token exchange failed (${res.status}). The redirect URI registered in ` +
        `the Spotify dashboard must exactly match:\n${redirectUri()}`,
    )
  }
  const json = (await res.json()) as {
    access_token: string
    refresh_token?: string
    expires_in: number
    scope?: string
  }
  const session: Session = {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresAt: Date.now() + json.expires_in * 1000,
    scope: json.scope ?? '',
  }
  storeSession(session)
  return session
}

export async function refresh(session: Session): Promise<Session | null> {
  if (!session.refreshToken) return null
  const res = await fetch(`${AUTH_HOST}/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: session.refreshToken,
    }),
  })
  if (!res.ok) return null
  const json = (await res.json()) as {
    access_token: string
    refresh_token?: string
    expires_in: number
    scope?: string
  }
  const next: Session = {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? session.refreshToken,
    expiresAt: Date.now() + json.expires_in * 1000,
    scope: json.scope ?? session.scope,
  }
  storeSession(next)
  return next
}

/** Returns a session with a live token, refreshing or clearing as needed. */
export async function validSession(): Promise<Session | null> {
  const s = loadSession()
  if (!s) return null
  if (Date.now() < s.expiresAt - 60_000) return s
  const next = await refresh(s)
  if (!next) storeSession(null)
  return next
}

export async function getProfile(session: Session): Promise<Profile | null> {
  const res = await fetch(`${API}/me`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  })
  if (!res.ok) return null
  const json = (await res.json()) as { display_name?: string; product?: string }
  return { displayName: json.display_name ?? 'Spotify listener', product: json.product ?? null }
}

export function logout(): void {
  storeSession(null)
}


const norm = (v: string) =>
  v
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\(.*?\)|\[.*?\]/g, ' ')
    .replace(/[^\p{Letter}\p{Number} ]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

interface SpotifyTrack {
  uri: string
  name: string
  duration_ms: number
  artists: { name: string }[]
}

/**
 * Find the Spotify track that matches a catalogue track. Scored rather than
 * taken first-hit, because a bare search happily returns covers, live cuts and
 * unrelated songs that merely share a word with the title.
 */
export async function findTrackUri(
  session: Session,
  artist: string,
  title: string,
): Promise<{ uri: string; durationMs: number } | null> {
  const params = new URLSearchParams({
    q: `${artist} ${title}`,
    type: 'track',
    limit: '10',
  })
  const res = await fetch(`${API}/search?${params}`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  })
  if (!res.ok) return null
  const json = (await res.json()) as { tracks?: { items: SpotifyTrack[] } }
  const items = json.tracks?.items ?? []
  if (!items.length) return null

  const wantTitle = norm(title)
  const wantArtist = norm(artist)
  let best: { track: SpotifyTrack; score: number } | null = null
  for (const t of items) {
    const gotTitle = norm(t.name)
    const gotArtists = t.artists.map((a) => norm(a.name)).join(' ')
    let score = 0
    if (gotTitle === wantTitle) score += 6
    else if (gotTitle.startsWith(wantTitle) || wantTitle.startsWith(gotTitle)) score += 4
    else continue // a title that doesn't even prefix-match isn't the track
    // Require some artist agreement, so covers don't win.
    const artistWords = wantArtist.split(' ').filter((w) => w.length > 2)
    const hits = artistWords.filter((w) => gotArtists.includes(w)).length
    if (!hits) continue
    score += (hits / Math.max(1, artistWords.length)) * 4
    if (!best || score > best.score) best = { track: t, score }
  }
  if (!best) return null
  return { uri: best.track.uri, durationMs: best.track.duration_ms }
}
