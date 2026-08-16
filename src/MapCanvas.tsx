import { useEffect, useRef } from 'react'
import { select, zoom, zoomIdentity, quadtree } from 'd3'
import type { ZoomTransform, Quadtree } from 'd3'
import { LABEL_KEYS, LABEL_META, WORLD, spectrumToY } from './data'
import type { CatalogLayout } from './data'
import { MILESTONES } from './milestones'
import { SHAPE_LABEL, traceShape } from './shapes'
import type { ThemeColors } from './themes'
import type { MapNode, ViewKey } from './types'

interface Props {
  layout: CatalogLayout
  view: ViewKey
  isActive: (n: MapNode) => boolean
  /** chronological path of the highlighted artist's releases, empty when off */
  constellation: MapNode[]
  selectedId: string | null
  onSelect: (n: MapNode | null) => void
  /** live theme + accessibility settings; the canvas can't read CSS variables */
  colors: ThemeColors
  fontScale: number
  highContrast: boolean
  reduceMotion: boolean
  largeMarks: boolean
}

const MAX_R = 7.5

const SPECTRUM_BANDS = [
  { s: 0.08, label: 'UPLIFTING / TRANCE' },
  { s: 0.36, label: 'PROGRESSIVE' },
  { s: 0.62, label: 'DEEP / MELODIC' },
  { s: 0.9, label: 'AMBIENT / CHILL' },
]

export default function MapCanvas({
  layout,
  view,
  isActive,
  constellation,
  selectedId,
  onSelect,
  colors,
  fontScale,
  highContrast,
  reduceMotion,
  largeMarks,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  // Live values the draw loop reads without re-running the setup effect.
  const stateRef = useRef({
    transform: zoomIdentity as ZoomTransform,
    tree: null as Quadtree<MapNode> | null,
    hovered: null as MapNode | null,
    fitted: false,
    userZoomed: false,
    viewMix: 0, // 0 = lane view, 1 = spectrum view; eased toward the target each frame
    scheduleDraw: () => {},
    props: { layout, view, isActive, constellation, selectedId, onSelect, colors, fontScale, highContrast, reduceMotion, largeMarks },
  })
  stateRef.current.props = { layout, view, isActive, constellation, selectedId, onSelect, colors, fontScale, highContrast, reduceMotion, largeMarks }

  // Hit-testing uses the *target* view's resting positions.
  useEffect(() => {
    const getX = view === 'spectrum' ? (d: MapNode) => d.sx : (d: MapNode) => d.lx
    const getY = view === 'spectrum' ? (d: MapNode) => d.sy : (d: MapNode) => d.ly
    stateRef.current.tree = quadtree<MapNode>().x(getX).y(getY).addAll(layout.nodes)
  }, [layout, view])

  useEffect(() => {
    const container = containerRef.current!
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const st = stateRef.current
    let raf = 0

    const scheduleDraw = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(draw)
    }
    st.scheduleDraw = scheduleDraw

    function size() {
      const dpr = window.devicePixelRatio || 1
      const { clientWidth: w, clientHeight: h } = container
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      return { w, h, dpr }
    }

    function draw() {
      const { w, h, dpr } = size()
      const { transform: t, props } = st
      const { layout, isActive, selectedId, colors, highContrast, reduceMotion, largeMarks } =
        props
      const markScale = largeMarks ? 1.55 : 1

      // Ease the view mix toward its target; keep animating until settled.
      const targetMix = props.view === 'spectrum' ? 1 : 0
      if (reduceMotion) st.viewMix = targetMix
      else st.viewMix += (targetMix - st.viewMix) * 0.16
      const mix = Math.abs(st.viewMix - targetMix) < 0.002 ? (st.viewMix = targetMix) : st.viewMix

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      drawTimeAxis(ctx, w, h, t, layout)
      drawMilestones(ctx, w, h, t, layout)
      drawLaneLabels(ctx, h, t, 1 - mix)
      drawSpectrumScale(ctx, t, mix)

      // Nodes, in world coordinates, positions blended between the two views.
      // Radius grows sub-linearly with zoom so dots stay readable when zoomed
      // out but don't balloon when zoomed in.
      ctx.setTransform(dpr * t.k, 0, 0, dpr * t.k, dpr * t.x, dpr * t.y)
      const rScale = 1 / Math.sqrt(t.k)
      const constellation = props.constellation
      const members = constellation.length
        ? new Set(constellation.map((n) => n.rel.id))
        : null
      const posOf = (n: MapNode): [number, number] => [
        n.lx + (n.sx - n.lx) * mix,
        n.ly + (n.sy - n.ly) * mix,
      ]

      const drawNode = (n: MapNode, alpha: number) => {
        const [px, py] = posOf(n)
        const r = n.r * rScale * markScale
        ctx.globalAlpha = alpha
        const color = colors[n.lane]
        traceShape(ctx, n.shape, px, py, r)
        if (n.shape === 'ring') {
          ctx.strokeStyle = color
          ctx.lineWidth = Math.max(r * 0.42, 0.75 / t.k)
          ctx.stroke()
        } else {
          ctx.fillStyle = color
          ctx.fill()
        }
      }

      let selected: MapNode | null = null
      for (const n of layout.nodes) {
        if (n.rel.id === selectedId) selected = n
        if (members?.has(n.rel.id)) continue // members drawn above the line
        // With a constellation lit, everything else recedes — but nodes that
        // match the current search/filters stay faintly readable.
        const lit = isActive(n)
        drawNode(
          n,
          members
            ? lit
              ? highContrast ? 0.5 : 0.3
              : highContrast ? 0.12 : 0.045
            : lit
              ? 0.92
              : highContrast ? 0.26 : 0.09,
        )
      }

      if (members) {
        // The constellation line, then its stars on top.
        ctx.globalAlpha = 1
        ctx.strokeStyle = `rgba(${colors.constellation}, ${highContrast ? 0.7 : 0.45})`
        ctx.lineWidth = 1 / t.k
        ctx.shadowColor = `rgba(${colors.constellation}, 0.6)`
        ctx.shadowBlur = 6
        ctx.beginPath()
        constellation.forEach((n, i) => {
          const [px, py] = posOf(n)
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        })
        ctx.stroke()
        ctx.shadowBlur = 0
        for (const n of constellation) drawNode(n, isActive(n) ? 1 : 0.55)
      }
      ctx.globalAlpha = 1

      const ring = (n: MapNode, color: string, glow?: string) => {
        const px = n.lx + (n.sx - n.lx) * mix
        const py = n.ly + (n.sy - n.ly) * mix
        if (glow) {
          ctx.shadowColor = glow
          ctx.shadowBlur = 14
        }
        ctx.strokeStyle = color
        ctx.lineWidth = 1.5 / t.k
        ctx.beginPath()
        ctx.arc(px, py, n.r * rScale * markScale + 3 / t.k, 0, Math.PI * 2)
        ctx.stroke()
        ctx.shadowBlur = 0
      }
      if (st.hovered && st.hovered.rel.id !== selectedId)
        ring(st.hovered, `rgba(${colors.constellation}, 0.75)`, colors[st.hovered.lane])
      if (selected) ring(selected, colors.ink, colors[selected.lane])

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (mix !== targetMix) scheduleDraw()
    }

    function drawLaneLabels(
      ctx: CanvasRenderingContext2D,
      h: number,
      t: ZoomTransform,
      alpha: number,
    ) {
      if (alpha < 0.02) return
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'left'
      const { colors, fontScale } = st.props
      ctx.font = `600 ${11 * fontScale}px system-ui, sans-serif`
      for (const key of LABEL_KEYS) {
        const meta = LABEL_META[key]
        const y = Math.max(28, Math.min(h - 40, t.applyY(meta.laneY)))
        const text = meta.name.toUpperCase()
        // The earliest releases sit right where this label draws, at the
        // canvas's fixed left edge — a scrim behind the text keeps it legible
        // over whatever dots happen to be underneath, in every theme.
        labelScrim(ctx, text, 14, y, colors.surface, 0.72 * alpha)
        ctx.globalAlpha = 0.9 * alpha
        ctx.fillStyle = colors[key]
        ctx.fillText(text, 14, y)
      }
      ctx.globalAlpha = 1
    }

    /** A soft rounded-rect behind left-aligned label text, so it stays
     * readable over map data instead of just alpha-blending with it. */
    function labelScrim(
      ctx: CanvasRenderingContext2D,
      text: string,
      x: number,
      y: number,
      fill: string,
      alpha: number,
    ) {
      const metrics = ctx.measureText(text)
      const textH =
        (metrics.actualBoundingBoxAscent ?? 8) + (metrics.actualBoundingBoxDescent ?? 3)
      const padX = 5
      const padY = 3
      const rx = x - padX
      const ry = y - textH / 2 - padY
      const rw = metrics.width + padX * 2
      const rh = textH + padY * 2
      ctx.globalAlpha = alpha
      ctx.fillStyle = fill
      if (ctx.roundRect) {
        ctx.beginPath()
        ctx.roundRect(rx, ry, rw, rh, 4)
        ctx.fill()
      } else {
        ctx.fillRect(rx, ry, rw, rh)
      }
    }

    function drawSpectrumScale(ctx: CanvasRenderingContext2D, t: ZoomTransform, alpha: number) {
      if (alpha < 0.02) return
      const w = canvas.clientWidth
      const yTop = t.applyY(spectrumToY(0))
      const yBottom = t.applyY(spectrumToY(1))

      // Gradient rail along the left edge, echoing the label colors.
      const { colors, fontScale } = st.props
      const grad = ctx.createLinearGradient(0, yTop, 0, yBottom)
      grad.addColorStop(0, colors.anjunabeats)
      grad.addColorStop(0.5, colors.anjunadeep)
      grad.addColorStop(1, colors.reflections)
      ctx.globalAlpha = 0.8 * alpha
      ctx.fillStyle = grad
      ctx.fillRect(8, yTop, 3, yBottom - yTop)

      ctx.textBaseline = 'middle'
      ctx.textAlign = 'left'
      ctx.font = `600 ${10 * fontScale}px system-ui, sans-serif`
      for (const band of SPECTRUM_BANDS) {
        const y = t.applyY(spectrumToY(band.s))
        ctx.globalAlpha = 0.28 * alpha
        ctx.strokeStyle = `rgba(${colors.constellation}, 1)`
        ctx.lineWidth = 1
        ctx.setLineDash([2, 6])
        ctx.beginPath()
        ctx.moveTo(90, y)
        ctx.lineTo(w - 10, y)
        ctx.stroke()
        ctx.setLineDash([])
        labelScrim(ctx, band.label, 18, y, colors.surface, 0.72 * alpha)
        ctx.globalAlpha = 0.85 * alpha
        ctx.fillStyle = colors.inkSecondary
        ctx.fillText(band.label, 18, y)
      }
      ctx.globalAlpha = 1
    }

    function drawTimeAxis(
      ctx: CanvasRenderingContext2D,
      w: number,
      h: number,
      t: ZoomTransform,
      layout: CatalogLayout,
    ) {
      const [t0, t1] = layout.timeDomain
      const y0 = new Date(t0).getUTCFullYear()
      const y1 = new Date(t1).getUTCFullYear()
      const yearW =
        (layout.timeToX(Date.UTC(2001, 0, 1)) - layout.timeToX(Date.UTC(2000, 0, 1))) * t.k
      const step = yearW > 55 ? 1 : yearW > 28 ? 2 : yearW > 12 ? 5 : 10

      const { colors, fontScale } = st.props
      ctx.font = `${11 * fontScale}px system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      for (let y = Math.ceil(y0 / step) * step; y <= y1; y += step) {
        const sx = t.applyX(layout.timeToX(Date.UTC(y, 0, 1)))
        if (sx < -20 || sx > w + 20) continue
        ctx.strokeStyle = colors.gridline
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(sx, 0)
        ctx.lineTo(sx, h - 26)
        ctx.stroke()
        ctx.fillStyle = colors.inkMuted
        ctx.fillText(String(y), sx, h - 10)
      }
      ctx.textAlign = 'left'
    }

    function drawMilestones(
      ctx: CanvasRenderingContext2D,
      w: number,
      h: number,
      t: ZoomTransform,
      layout: CatalogLayout,
    ) {
      const yearW =
        (layout.timeToX(Date.UTC(2001, 0, 1)) - layout.timeToX(Date.UTC(2000, 0, 1))) * t.k
      const showLabels = yearW > 90
      const { colors, fontScale } = st.props
      const gold = colors.milestone
      ctx.font = `600 ${10 * fontScale}px system-ui, sans-serif`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
      MILESTONES.forEach((m, i) => {
        const [y, mo] = m.date.split('-').map(Number)
        const sx = t.applyX(layout.timeToX(Date.UTC(y, (mo || 1) - 1, 1)))
        if (sx < -10 || sx > w + 10) return
        ctx.strokeStyle = `rgba(${gold}, 0.12)`
        ctx.lineWidth = 1
        ctx.setLineDash([1, 5])
        ctx.beginPath()
        ctx.moveTo(sx, 30)
        ctx.lineTo(sx, h - 30)
        ctx.stroke()
        ctx.setLineDash([])
        // Small diamond footnote above the axis.
        ctx.fillStyle = `rgba(${gold}, 0.7)`
        ctx.beginPath()
        ctx.moveTo(sx, h - 36)
        ctx.lineTo(sx + 3.2, h - 32)
        ctx.lineTo(sx, h - 28)
        ctx.lineTo(sx - 3.2, h - 32)
        ctx.closePath()
        ctx.fill()
        if (showLabels) {
          // Stagger label rows so neighbors don't collide.
          const ly = 22 + (i % 3) * 14
          ctx.fillStyle = `rgba(${gold}, 0.8)`
          ctx.fillText(m.label, sx + 6, ly)
        }
      })
    }

    function pick(event: MouseEvent): MapNode | null {
      const rect = canvas.getBoundingClientRect()
      const [wx, wy] = st.transform.invert([event.clientX - rect.left, event.clientY - rect.top])
      const found = st.tree?.find(wx, wy, MAX_R + 6 / st.transform.k)
      if (!found) return null
      const getX = st.props.view === 'spectrum' ? found.sx : found.lx
      const getY = st.props.view === 'spectrum' ? found.sy : found.ly
      const dist = Math.hypot(getX - wx, getY - wy)
      const rScale = 1 / Math.sqrt(st.transform.k)
      const markScale = st.props.largeMarks ? 1.55 : 1
      return dist <= found.r * rScale * markScale + 4 / st.transform.k ? found : null
    }

    const zoomBehavior = zoom<HTMLCanvasElement, unknown>()
      .scaleExtent([0.35, 30])
      .translateExtent([
        [-120, -120],
        [WORLD.w + 120, WORLD.h + 120],
      ])
      .clickDistance(5)
      .wheelDelta(
        (event) =>
          -event.deltaY *
          (event.deltaMode === 1 ? 0.02 : event.deltaMode ? 0.4 : 0.001) *
          (event.ctrlKey ? 8 : 1),
      )
      .on('zoom', (event) => {
        st.transform = event.transform
        if (event.sourceEvent) st.userZoomed = true
        scheduleDraw()
      })

    const selection = select(canvas).call(zoomBehavior)

    const fitTransform = () => {
      const { clientWidth: w, clientHeight: h } = container
      const k = Math.min(w / WORLD.w, (h - 30) / WORLD.h)
      const tx = (w - WORLD.w * k) / 2
      const ty = (h - 26 - WORLD.h * k) / 2
      return zoomIdentity.translate(tx, ty).scale(k)
    }

    // Double-click resets to the fitted overview instead of d3's default zoom-in.
    selection.on('dblclick.zoom', null)
    selection.on('dblclick', () => {
      st.userZoomed = false
      selection.transition().duration(350).call(zoomBehavior.transform, fitTransform())
    })

    // Fit the world to the viewport on first layout.
    if (!st.fitted && container.clientWidth > 0) {
      selection.call(zoomBehavior.transform, fitTransform())
      st.fitted = true
    }

    function onMove(event: MouseEvent) {
      const hit = pick(event)
      if (hit !== st.hovered) {
        st.hovered = hit
        canvas.style.cursor = hit ? 'pointer' : 'grab'
        scheduleDraw()
      }
      const tip = tooltipRef.current!
      if (hit) {
        const { rel } = hit
        tip.style.display = 'block'
        const rect = container.getBoundingClientRect()
        const px = event.clientX - rect.left
        tip.style.left = `${Math.min(px + 14, rect.width - 280)}px`
        tip.style.top = `${event.clientY - rect.top + 14}px`
        tip.innerHTML = ''
        const title = document.createElement('div')
        title.className = 'tip-title'
        title.textContent = `${rel.artist} — ${rel.title}`
        const meta = document.createElement('div')
        meta.className = 'tip-meta'
        meta.textContent = [SHAPE_LABEL[hit.shape], rel.year, rel.catno, LABEL_META[hit.lane].name]
          .filter(Boolean)
          .join(' · ')
        tip.append(title, meta)
      } else {
        tip.style.display = 'none'
      }
    }

    function onLeave() {
      st.hovered = null
      tooltipRef.current!.style.display = 'none'
      scheduleDraw()
    }

    function onClick(event: MouseEvent) {
      st.props.onSelect(pick(event))
    }

    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mouseleave', onLeave)
    canvas.addEventListener('click', onClick)
    // Track the viewport until the user takes the camera themselves.
    const ro = new ResizeObserver(() => {
      if (!st.userZoomed) selection.call(zoomBehavior.transform, fitTransform())
      else scheduleDraw()
    })
    ro.observe(container)
    scheduleDraw()

    return () => {
      cancelAnimationFrame(raf)
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('mouseleave', onLeave)
      canvas.removeEventListener('click', onClick)
      ro.disconnect()
      selection.on('.zoom', null)
    }
  }, [])

  // Redraw when filters/selection/view/constellation change.
  useEffect(() => {
    stateRef.current.scheduleDraw()
  }, [layout, view, isActive, selectedId, constellation, colors, fontScale, highContrast, reduceMotion, largeMarks])

  return (
    <div ref={containerRef} className="map-container">
      <canvas ref={canvasRef} />
      <div ref={tooltipRef} className="tooltip" />
    </div>
  )
}
