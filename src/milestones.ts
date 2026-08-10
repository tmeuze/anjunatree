// Curated landmarks drawn on the time axis. Editorial, deliberately short —
// each entry earns its pixel. Dates are month-accurate.
export interface Milestone {
  date: string
  label: string
  blurb: string
}

export const MILESTONES: Milestone[] = [
  { date: '2000-11', label: 'ANJ001', blurb: 'Above & Beyond found Anjunabeats with “Volume One”' },
  { date: '2003-10', label: 'Volume One (mix)', blurb: 'the first Anjunabeats Volume compilation' },
  { date: '2005-10', label: 'Anjunadeep', blurb: 'the deep sister label launches' },
  { date: '2006-03', label: 'Tri-State', blurb: 'Above & Beyond’s debut artist album' },
  { date: '2008-07', label: 'Sirens of the Sea', blurb: 'OceanLab’s only — and beloved — album' },
  { date: '2011-06', label: 'Group Therapy', blurb: 'the album that named the radio show' },
  { date: '2012-11', label: 'ABGT begins', blurb: 'Group Therapy radio, episode 001' },
  { date: '2015-01', label: 'We Are All We Need', blurb: 'Above & Beyond’s fourth studio album' },
  { date: '2018-01', label: 'Common Ground', blurb: 'Grammy-nominated era begins' },
  { date: '2019-07', label: 'Flow State', blurb: 'the ambient turn' },
  { date: '2022-04', label: 'Anjunachill', blurb: 'the chill sublabel arrives' },
]
