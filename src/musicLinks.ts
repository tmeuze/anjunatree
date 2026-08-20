// "Listen on…" — zero-dependency search links out to other services, shown
// to every visitor regardless of whether they've connected anything.
//
// Two other approaches were considered and deliberately rejected:
//
// - A smart-link aggregator (Odesli/song.link), which resolves one link to
//   the same track across every service. Checked its current status before
//   building on it: Odesli has stopped issuing new API keys and its API
//   carries a deprecation notice with a retirement date that's already
//   passed (still limping along past it, but not something to build a real
//   dependency on).
// - Exact-match links via Spotify's Client Credentials flow (app-level auth,
//   no per-user login, and — importantly — not subject to Development
//   Mode's 5-user cap the way the per-user OAuth flow this app already uses
//   for playback is). That flow needs a client secret, and this is a fully
//   static site with no server anywhere to hold one safely; putting it in a
//   VITE_ variable would expose it to every visitor's devtools, which is
//   exactly the misuse Spotify's own docs warn against. Not happening here
//   without a real architecture change.
//
// A constructed search URL needs no API call, no auth, no key to leak or
// service to sunset — it just works, for every visitor, on every service,
// indefinitely. The cost is a search result to pick from rather than a
// guaranteed single link; for a release title plus its artist, that's a
// trivial pick, not a real usability tax.

export interface MusicLink {
  id: 'spotify' | 'apple' | 'youtube'
  label: string
  url: string
}

const query = (artist: string, title: string) => encodeURIComponent(`${artist} ${title}`)

export function musicLinks(artist: string, title: string): MusicLink[] {
  const q = query(artist, title)
  return [
    { id: 'spotify', label: 'Spotify', url: `https://open.spotify.com/search/${q}` },
    { id: 'apple', label: 'Apple Music', url: `https://music.apple.com/search?term=${q}` },
    { id: 'youtube', label: 'YouTube Music', url: `https://music.youtube.com/search?q=${q}` },
  ]
}
