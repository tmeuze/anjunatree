// The extended Anjuna family — groundwork for the future sublabel selector.
//
// Structure follows the parent company's own taxonomy, from
// involved-group.com (checked 2026-08-10). Involved Group divides its music
// business into, among others:
//
//   Record labels   Anjunabeats · Anjunadeep · Anjunachill · Explorations
//   Label services  17 Steps · This Never Happened
//   Management      Above & Beyond · Dusky · Lane 8 · Le Youth · DJ Carpenter
//   Publishing      Involved Publishing        Design  Involved Design
//   Events          ABGT · Group Therapy Weekender · Anjunadeep Open Air …
//
// That split is why the app models three tiers rather than a flat list — the
// company itself distinguishes labels it *owns* from labels it *services*:
//
//   'imprint'      owned outright; already ingested and folded into the three
//                  core lanes by scripts/ingest.ts:
//                    Anjunabeats  4fcdf709… · AnjunaDigital 298fb638… (defunct)
//                    Anjunadeep   5b66608b… · Anjunadeep Explorations 71c0430b…
//                    Reflections  23dc1e6f… · Anjunachill 6f890c63… (rebrand)
//   'services'     artist-owned, distributed/serviced by Involved Group —
//                  formally part of the family, listed on their own site.
//   'independent'  artist-run, no stated Involved Group relationship. Include
//                  only with the artist's blessing, and label them honestly.
//
// None of the tiers below are ingested yet. Plan of record when they are: one
// shared "family" lane color (the three core label colors are a complete
// CVD-validated set — re-run the dataviz palette validator before adding a
// fourth), one lane per label, chosen from a dropdown that is separate from
// the core label chips.

export type FamilyTier = 'services' | 'independent'

export interface FamilyLabel {
  key: string
  name: string
  founder: string
  tier: FamilyTier
  /** MusicBrainz label MBID — null means not yet catalogued there */
  mbid: string | null
  releaseCount: number | null
  notes: string
}

export const FAMILY_LABELS: FamilyLabel[] = [
  {
    key: 'tnh',
    name: 'This Never Happened',
    founder: 'Lane 8',
    tier: 'services',
    mbid: '2ae97b16-6a97-481c-b733-99499d488a78',
    releaseCount: 560,
    notes:
      'Founded 2016. On Involved Group’s label-services roster; Lane 8 is also Involved-managed. The biggest offshoot by far — big enough to warrant its own lane.',
  },
  {
    key: 'seventeensteps',
    name: '17 Steps',
    founder: 'Dusky',
    tier: 'services',
    mbid: '60c03c5e-6347-4048-8440-521a38fe7e79',
    releaseCount: null,
    notes:
      'Founded 2014. On Involved Group’s label-services roster; Dusky are Involved-managed. (An earlier note here guessed its family status was loose — the company’s own site says otherwise.)',
  },
  {
    key: 'oddoneout',
    name: 'Odd One Out',
    founder: 'Yotto',
    tier: 'independent',
    mbid: 'a112c907-fc3c-4b11-8cba-b62d629a1925',
    releaseCount: null,
    notes:
      'Founded 2019 by an Anjunadeep mainstay, but not listed among Involved Group’s labels or services — treat as independent.',
  },
  {
    key: 'marshan',
    name: 'MarshanMusic',
    founder: 'Marsh',
    tier: 'independent',
    mbid: null,
    releaseCount: null,
    notes:
      'Not listed by Involved Group, and not in MusicBrainz either (checked 2026-08-10) — needs its discography added there, or an ingest path via Discogs/iTunes.',
  },
]
