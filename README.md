# AnjunaTree

An interactive map of the Anjunabeats / Anjunadeep / Anjunachill catalog —
every release since 2000 plotted on a zoomable timeline, with 30-second
previews on click.

Two views: **Labels** (one lane per label) and **Spectrum** (releases arranged
along a curated trance → ambient genre axis), with an animated transition
between them. Release types are encoded as shapes — square = studio album,
diamond = compilation/mix (the *Volumes*), ring = remix package,
triangle = EP, circle = single — with a legend that recomputes against the
active filters.

## Running it

```bash
npm install
npm run dev
```

The catalog data ships in `public/data/catalog.json`. To refresh it from
MusicBrainz (takes ~1.5 minutes due to their 1 req/s rate limit):

```bash
npm run ingest
```

## How it works

- **Data** — `scripts/ingest.ts` pulls every release for the six official
  Anjuna label entities from the MusicBrainz API (no key required) — the
  ownership chain under Involved Group: Anjunabeats, AnjunaDigital,
  Anjunadeep, Anjunadeep Explorations, Reflections, and Anjunachill — then
  dedupes by release-group and writes a normalized `catalog.json`.
  Radio-show "Broadcast" entries are excluded; each entity folds into one of
  the three lanes (see the `LABELS` table in the script). Artist-run
  offshoot labels (This Never Happened, Odd One Out, …) are researched and
  registered in `src/familyLabels.ts` but not yet ingested.
- **Map** — `src/MapCanvas.tsx` renders all ~2,750 releases on a canvas:
  x = release date, three lanes per label, dot size by type
  (Album > EP > Single), packed with a one-shot d3 force simulation
  (`src/data.ts`). Zoom/pan via d3-zoom, hover hit-testing via d3-quadtree,
  double-click resets the view.
- **Previews & track lists** — clicking a release looks it up on the iTunes
  Search API (`src/itunes.ts`, no auth needed), then pulls the collection's
  full track list via `/lookup?entity=song` — every track with its own
  30-second preview, played from the release panel with auto-advance. Apple
  serves `access-control-allow-origin: *` on both endpoints, so the browser
  calls them directly and the app needs no server of its own. (Local dev
  still routes through the Vite proxy at `/itunes`; `VITE_ITUNES_BASE` is an
  escape hatch if Apple ever drops that header.)
- **Constellations** — selecting a release lights up every release sharing
  its artist's MusicBrainz ID, connected chronologically; chips in the panel
  switch between credited artists (Various Artists is deliberately inert).
- **Radio** — plays through the map chronologically (or walks the current
  constellation), one preview per release, skipping unmatched ones.
- **Shareable URLs** — the hash always encodes view, search, filters, and
  selection; any view of the map is a link.
- **Milestones** — a curated set of label landmarks (`src/milestones.ts`)
  drawn on the time axis; labels appear as you zoom in.
- **Colors** — the three label colors (`#3987e5` / `#199e70` / `#d95926`)
  are a CVD-validated categorical set: all pairs pass colorblind-separation
  and 3:1 contrast checks against the app's dark surface. Shape carries the
  release-type channel so identity is never color-alone.
- **Spectrum** — `src/spectrum.ts` is deliberately editorial: no open data
  source has per-release genre, so each release gets a label baseline nudged
  by hand-curated positions for ~50 roster-defining artists plus a stable
  per-artist jitter. Upgrading it to real data (e.g. a MusicBrainz genre-tag
  crawl, ~45 min at their rate limit) slots in behind the same
  `spectrumScore()` function.

## Connecting music services (login tier — in progress)

The anonymous tier (iTunes previews) needs nothing. The full-track tier for
subscribers needs credentials only you can create:

**Spotify** (Premium users, Web Playback SDK)
1. <https://developer.spotify.com/dashboard> → *Create app*.
2. Redirect URI: `http://127.0.0.1:5173/callback` — Spotify no longer accepts
   plain-http `localhost`, use the literal loopback IP (and browse the dev
   site at `127.0.0.1:5173`, not `localhost:5173`, when testing login).
   Add the production HTTPS URI later.
3. Tick *Web API* and *Web Playback SDK*. Copy the **Client ID** into
   `.env.local` as `VITE_SPOTIFY_CLIENT_ID=…` (PKCE flow — no client secret
   anywhere in the app).
4. While the app is in Development Mode, add your own Spotify account under
   *User Management* (up to 25 testers; public login requires requesting
   Extended Quota Mode later).

**Apple Music** (subscribers, MusicKit JS)
1. Developer account → *Certificates, Identifiers & Profiles* →
   *Identifiers* → new **Media ID** (e.g. `music.one.a64.anjunatree`).
2. *Keys* → new key with **Media Services (MusicKit)** enabled, bound to that
   Media ID → download the `.p8` (one-time download; it is gitignored here,
   never commit it).
3. `node scripts/apple-token.mjs AuthKey_XXXX.p8 <TEAM_ID> <KEY_ID>` → paste
   the printed JWT into `.env.local` as `VITE_APPLE_DEV_TOKEN=…`
   (max validity 180 days — regenerate twice a year).

`.env.local` is gitignored; both values are client-side-safe by design (the
Client ID is public, the Apple token is meant to ship to browsers — the
secret `.p8` stays on your machine).

## Hosting

AnjunaTree is a **fully static site** — `npm run build` emits a `dist/` folder
(~300 kB of JS, ~1.1 MB of catalog JSON; roughly 310 kB over the wire gzipped)
that any static host can serve. There is no server, no database, and no
runtime compute: the layout, search, and filtering all run in the visitor's
browser, and the two APIs it talks to (MusicBrainz at build time, iTunes at
listen time) are called directly.

HTTPS is required in production — both Spotify's redirect URIs and Apple's
MusicKit refuse plain HTTP.

**GitHub Pages** is the default here: `.github/workflows/deploy.yml` builds and
publishes on every push to `main`. To turn it on: *Settings → Pages → Source:
**GitHub Actions*** (not "Deploy from a branch").

There is **no `gh-pages` branch** — the workflow uploads `dist/` as a Pages
artifact and deploys it directly, so nothing publish-related is ever committed
to the repo. `main` stays the only branch.

Vite is configured with `base: './'` so a single build works both at a domain
root (`anjunatree.com`) and at a project subpath
(`<user>.github.io/anjunatree/`) — which is where the site lives until DNS is
pointed at GitHub. Keep it relative if you add asset paths.

For the custom domain, set it under *Settings → Pages* (the Actions deploy
method stores it in repo settings; no `CNAME` file needed) and point DNS at
GitHub — four `A` records for the apex (`185.199.108.153`, `.109.153`,
`.110.153`, `.111.153`) plus a `CNAME` for `www` → `<user>.github.io`.

Any of these work equally well if you'd rather not use Pages: Cloudflare Pages,
Netlify, Vercel, or plain nginx on your own box (`root /srv/anjunatree/dist;`
with a `try_files $uri /index.html;` line). Nothing in the app depends on the
host's features.

## Secrets, and why there are almost none

This project is designed so that **contributors can have the whole repo and
still not hold anything sensitive**:

- **`VITE_SPOTIFY_CLIENT_ID` is not a secret.** The PKCE authorization flow
  exists precisely so browser apps need no client secret; the Client ID is
  published in the bundle to every visitor. Store it as a GitHub repository
  *variable*, not a secret.
- **`VITE_APPLE_DEV_TOKEN` is not really a secret either.** MusicKit requires
  the token to reach the browser, so any visitor can read it. It is kept in
  GitHub *secrets* only to avoid pinning a rotating value into git history.
- **The Apple `.p8` private key is the one real secret.** It never goes to a
  browser, never goes into CI, and never goes into the repo (it is gitignored).
  It lives on the maintainer's machine and is used offline by
  `scripts/apple-token.mjs` to mint tokens.

Anything prefixed `VITE_` is inlined into the JavaScript bundle at build time.
**Never put a genuine secret in a `VITE_` variable** — it protects nothing.
See `.env.example`.

One caveat worth understanding before adding collaborators: on GitHub, anyone
with **write** access can add a workflow that prints a repository secret, so
repo secrets are not a boundary against maintainers — only against the public
and against pull requests from forks (which are denied secrets by design). If
you need a real boundary, either scope deployment credentials to a *protected
environment* with required reviewers, or keep them out of GitHub entirely by
letting your host (Cloudflare/Netlify) build from the repo with credentials
stored in its own dashboard.

## Roadmap

- [ ] Full-track playback for logged-in listeners: Spotify Web Playback SDK
      (requires registering a Spotify developer app; Premium-only) and/or
      Apple MusicKit JS.
- [ ] Extended-family labels (with the artists' blessing where possible),
      grouped by the parent company's own taxonomy — see
      `src/familyLabels.ts`: *label services* clients of Involved Group
      (This Never Happened, 17 Steps) and *independent* artist labels
      (Odd One Out, MarshanMusic). Needs a lane/color design decision: the
      current 3-color palette is validated all-pairs, so a 4th+ label group
      means re-running the palette validator (likely one shared "family"
      color rather than one per label).
- [ ] Replace the curated spectrum with real genre data (MusicBrainz
      genre-tag crawl per release-group).
- [ ] PWA (installable, offline-browsable map) via `vite-plugin-pwa`.
