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

## Before opening a pull request

```bash
npm run build     # type-checks and builds
```

The app must stay a **static site with no server component** and **no secrets
in the client bundle**. See the "Secrets" section of the README before adding
any credential or API integration.
