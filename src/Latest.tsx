import { useMemo } from 'react'
import { LABEL_META, labelVar } from './data'
import type { CatalogLayout } from './data'
import { SHAPE_LABEL } from './shapes'
import type { MapNode } from './types'

interface Props {
  layout: CatalogLayout
  generatedAt: string | null
  selectedId: string | null
  onSelect: (n: MapNode) => void
  onClose: () => void
}

const MAX_ROWS = 150

const monthLabel = (t: number) =>
  new Date(t).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })

const dayLabel = (rel: { date: string }) => {
  const parts = rel.date.split('-')
  if (parts.length < 3) return '—'
  return String(Number(parts[2]))
}

function group(nodes: MapNode[]) {
  const out: { month: string; items: MapNode[] }[] = []
  for (const n of nodes) {
    const m = monthLabel(n.time)
    if (out[out.length - 1]?.month !== m) out.push({ month: m, items: [] })
    out[out.length - 1].items.push(n)
  }
  return out
}

export default function Latest({ layout, generatedAt, selectedId, onSelect, onClose }: Props) {
  const { upcoming, recent } = useMemo(() => {
    const now = Date.now()
    const sorted = [...layout.nodes].sort((a, b) => b.time - a.time)
    return {
      upcoming: sorted.filter((n) => n.time > now).reverse(),
      recent: sorted.filter((n) => n.time <= now).slice(0, MAX_ROWS),
    }
  }, [layout])

  const Row = ({ n }: { n: MapNode }) => (
    <button
      className={`latest-row${n.rel.id === selectedId ? ' on' : ''}`}
      onClick={() => onSelect(n)}
    >
      <span className="latest-day">{dayLabel(n.rel)}</span>
      <span className="latest-main">
        <span className="latest-title">
          {n.rel.artist} — {n.rel.title}
        </span>
        <span className="latest-meta">
          <span className="latest-dot" style={{ background: labelVar(n.lane) }} />
          {LABEL_META[n.lane].name} · {SHAPE_LABEL[n.shape]}
          {n.rel.catno ? ` · ${n.rel.catno}` : ''}
        </span>
      </span>
    </button>
  )

  return (
    <aside className="latest" aria-label="Release Tracker">
      <div className="settings-head">
        <h2>Release Tracker</h2>
        <button className="panel-close settings-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      <div className="latest-body">
        {upcoming.length > 0 && (
          <>
            <div className="latest-section">Announced · not out yet</div>
            {group(upcoming).map((g) => (
              <section key={`u-${g.month}`}>
                <h3 className="latest-month">{g.month}</h3>
                {g.items.map((n) => (
                  <Row key={n.rel.id} n={n} />
                ))}
              </section>
            ))}
          </>
        )}
        <div className="latest-section">Out now</div>
        {group(recent).map((g) => (
          <section key={`r-${g.month}`}>
            <h3 className="latest-month">{g.month}</h3>
            {g.items.map((n) => (
              <Row key={n.rel.id} n={n} />
            ))}
          </section>
        ))}
        <p className="set-foot">
          Newest {MAX_ROWS} releases from the catalogue. Pick any row to find it on the
          map and hear it.
          {generatedAt
            ? ` Catalogue last updated ${new Date(generatedAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}, refreshed automatically each week from MusicBrainz.`
            : ' Refreshed automatically each week from MusicBrainz.'}
        </p>
      </div>
    </aside>
  )
}
