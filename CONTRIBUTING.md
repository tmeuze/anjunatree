# Contributing

AnjunaTree is a non-commercial fan project. Issues, ideas, and corrections are
welcome — especially to the editorial parts (`src/spectrum.ts`,
`src/milestones.ts`, `src/familyLabels.ts`), which are meant to be argued with.

## Commit messages

One line, lower case, words joined by hyphens, prefixed with the kind of
change:

```
feature-personal-constellation
bugfix-mobile-viewport
docs-hosting-setup
refactor-itunes-matching
data-reingest-anjunachill
chore-bump-vite
```

Keep it succinct — the subject should read as a short slug, not a sentence. No
trailing period, no capital letters, no scope parentheses.

## Where to change things

Every piece of editable content lives in one obvious file. Edit, check it with
`npm run dev`, then commit and push — GitHub Actions rebuilds and redeploys.

| To change… | Edit | Notes |
|---|---|---|
| Tagline, header, footer disclaimer | `src/App.tsx` | The tagline is the `brand-sub` span; the disclaimer is the `site-footer` element. |
| Repo / label links | `src/constants.ts` | `REPO_URL`, `LABEL_SITE_URL`. |
| "What is this", "How to use", "Install", "About" copy | `src/Info.tsx` | One block per tab. Add a tab by extending `InfoTab` and `TAB_TITLE`. |
| Colour themes and their names | `src/themes.ts` | **Re-run the palette validator** — see below. |
| Default settings | `src/settings.ts` | Also the font-size steps. |
| Timeline milestones | `src/milestones.ts` | Date, short label, blurb. |
| Genre spectrum positions | `src/spectrum.ts` | Editorial by design; argue with it. |
| Release-type shapes and names | `src/shapes.ts` | Shape is the non-colour identity channel — keep them distinct. |
| Extended-family labels | `src/familyLabels.ts` | Research notes and MBIDs. |
| Which labels get ingested | `scripts/ingest.ts` | The `LABELS` table; `key` folds an entity into a lane. |
| App name, icons, install behaviour | `vite.config.ts` (manifest) | Icons come from `scripts/make-icons.mjs` — re-run it after a colour change. |
| Weekly refresh timing | `.github/workflows/refresh-catalogue.yml` | The `cron` line. |

### Text sizes

Don't write raw `font-size: 14px`. Use `font-size: calc(14px * var(--font-scale))`
so the text-size setting keeps working. Canvas text multiplies by the
`fontScale` prop instead.

### Themes

The three label colours carry identity on the map, so a new or edited theme has
to be validated against its own surface before shipping:

```bash
node <dataviz-skill>/scripts/validate_palette.js \
  "#3987e5,#199e70,#d95926" --mode dark --surface "#0b0d12" --pairs all
```

Every check must PASS — lightness band, chroma floor, colour-blind separation,
normal-vision floor, and 3:1 contrast against the surface. The current results
are recorded at the top of `src/themes.ts`.

### Keeping the catalogue fresh

`.github/workflows/refresh-catalogue.yml` re-reads MusicBrainz every Monday.
`scripts/ingest.ts` rewrites `catalog.json` only when the releases actually
changed, so a quiet week produces no commit and no deploy. Run it by hand any
time with `npm run ingest`, or from the Actions tab via *Run workflow*.

> GitHub disables scheduled workflows on repositories with no activity for 60
> days. If the catalogue ever goes stale, check the Actions tab first.

## Before opening a pull request

```bash
npm run build     # type-checks and builds
```

The app must stay a **static site with no server component** and **no secrets
in the client bundle**. See the "Secrets" section of the README before adding
any credential or API integration.
