# Changelog

The in-app version (About → What's new) is the short, listener-facing cut of
this list — what someone would actually notice, not every commit. This file
is the fuller, developer-facing version; see `git log` for the complete
history.

## 2026-08-11 — Full tracks, and a proper player

- Spotify Web Playback SDK: Premium listeners get full-length tracks instead
  of previews, with automatic fallback to iTunes when Spotify doesn't carry
  a track.
- Player bar rebuilt as a single custom transport (play/pause, mute, stop,
  progress) shared by both playback sources, instead of native `<audio>`
  controls plus a separate ad hoc Spotify transport.
- The real brandmark (`brand/brandmark/at-palm-fan.svg`) replaces the
  placeholder mark, rendered with gradients derived from the active theme.
- Fixed a hang where the Spotify player could get stuck on "Connecting…"
  indefinitely (a re-render loop in `useSpotify`, not a Firefox issue as
  first suspected — Firefox works fine).
- Fixed intermittent "Lookup failed" on iOS Safari (Apple's CORS headers
  interacting badly with the HTTP cache across origins) with a request
  retry and an in-memory response cache.
- Added a standard status-toast system (`src/status.ts` /
  `StatusToasts.tsx`) for progress/error messages, replacing scattered
  inline text.
- Header restructured into independently collapsing sections (search,
  filters, actions) so it never wraps or clips at any width; search
  collapses to an icon by default at every width, not just on mobile.
- Info modal simplified: a single "Get started" tab with CTAs, a
  changelog section and a Help section (links straight to a new GitHub
  issue) inside About; deep technical detail lives in the README instead.
- First visit opens the welcome tab automatically; a returning visit after
  a new entry lands here opens the changelog. Both use one localStorage
  marker (`anjunatree:last-seen-version`).
- Update banner now performs a real cache-bypassing reload rather than a
  plain `location.reload()`.

## 2026-08-10 — Personalise it

- Four themes named after the music (Black Room Boy, Sirens of the Sea,
  Flow State, Sun & Moon), plus text size, high contrast, larger map marks
  and reduced motion — all in Settings, all persisted locally.
- Installable PWA: manifest, offline precache of the shell/catalogue/fonts,
  install banner, and an "Install as an app" tab in the info modal.
- Spotify sign-in (PKCE) added, ahead of full playback.
- Latest-releases feed: a changelog-style list of newest and
  announced-but-unreleased catalogue entries.
- Weekly catalogue refresh workflow; the ingest script now writes nothing
  when a run finds no changes.

## 2026-08-06 — Follow an artist

- Artist constellations: selecting a release traces every release sharing
  that artist across the map, chronologically.
- Radio mode: plays through the map (or the current constellation) one
  release at a time.
- Spectrum view: a curated genre axis as an alternative to the label lanes.
- Release-type shapes (album/EP/single/compilation/remix package) with a
  legend that recomputes against active filters.
- Shareable URLs — the hash encodes view, search, filters and selection.

## 2026-08-04 — AnjunaTree launches

- Full Anjunabeats/Anjunadeep/Anjunachill catalogue ingested from
  MusicBrainz (~2,900 releases) and laid out as a zoomable timeline map.
- Click-to-play 30-second previews via the iTunes Search API.
