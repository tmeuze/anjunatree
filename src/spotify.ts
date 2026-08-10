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

// Read scopes only, for now. Full-track playback later adds streaming +
// user-read-playback-state; saving releases would add user-library-modify.
const SCOPES = ['user-read-email', 'user-read-private']

export interface Session {
  accessToken: string
  refreshToken: string | null
  expiresAt: number
}

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
    return s.accessToken ? s : null
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

  if (error || !code || !verifier) return null
  // Mismatched state means the redirect wasn't one we started.
  if (!expectedState || returnedState !== expectedState) return null

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
  if (!res.ok) return null
  const json = (await res.json()) as {
    access_token: string
    refresh_token?: string
    expires_in: number
  }
  const session: Session = {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresAt: Date.now() + json.expires_in * 1000,
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
  }
  const next: Session = {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? session.refreshToken,
    expiresAt: Date.now() + json.expires_in * 1000,
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
