import { useEffect, useRef } from 'react'

/*
 * CursorField — a static orange aura that sticks to the cursor, plus a grid
 * that lights up beneath it.
 *
 * A single soft orange glow is centered directly on the pointer — no spring,
 * lag, or comet tail — at a fixed color and opacity. The copybook grid lines
 * within a radius of the cursor brighten and thicken in harmony with the aura.
 *
 * Everything is drawn in one fixed, pointer-events-none canvas that sits
 * between the base grid (z-0) and the page content (z-2). The field fades out
 * over concrete UI (links, buttons, inputs, [data-cursor-block]) so it never
 * bleeds across cards or hurts readability.
 */

// Static orange aura tones — warm core melting into a deeper edge.
const ORANGE_CORE: [number, number, number] = [255, 168, 84] // soft amber
const ORANGE_EDGE: [number, number, number] = [249, 115, 22] // tailwind orange-500

const GRID = 60 // matches the CSS copybook grid cell size
const GRID_RADIUS = 200 // how far the grid reacts around the cursor
const BLOCK_SELECTOR =
  'a, button, input, textarea, select, label, [role="button"], [data-cursor-block]'

export function CursorField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    let width = 0
    let height = 0
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    // Pointer position; the aura sticks directly to it (no lag/inertia).
    const pointer = { x: width / 2, y: height / 2, active: false }
    let field = 0 // visibility 0→1 (smoothed; fades out over UI)

    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX
      pointer.y = e.clientY
      const el = document.elementFromPoint(e.clientX, e.clientY)
      pointer.active = !el?.closest(BLOCK_SELECTOR)
    }
    const onLeave = () => {
      pointer.active = false
    }

    // Draw the brand-tinted grid illumination within GRID_RADIUS of the cursor.
    const drawGrid = (cx: number, cy: number, r: number, g: number, b: number, alpha: number) => {
      const R = GRID_RADIUS
      ctx.lineCap = 'round'
      // Vertical lines
      for (let x = Math.ceil((cx - R) / GRID) * GRID; x <= cx + R; x += GRID) {
        const dx = Math.abs(x - cx)
        const prox = 1 - dx / R
        if (prox <= 0) continue
        const grad = ctx.createLinearGradient(x, cy - R, x, cy + R)
        const col = (op: number) => `rgba(${r | 0},${g | 0},${b | 0},${op})`
        grad.addColorStop(0, col(0))
        grad.addColorStop(0.5, col(alpha * prox))
        grad.addColorStop(1, col(0))
        ctx.strokeStyle = grad
        ctx.lineWidth = 0.6 + prox * 1.4
        ctx.beginPath()
        ctx.moveTo(x, cy - R)
        ctx.lineTo(x, cy + R)
        ctx.stroke()
      }
      // Horizontal lines
      for (let y = Math.ceil((cy - R) / GRID) * GRID; y <= cy + R; y += GRID) {
        const dy = Math.abs(y - cy)
        const prox = 1 - dy / R
        if (prox <= 0) continue
        const grad = ctx.createLinearGradient(cx - R, y, cx + R, y)
        const col = (op: number) => `rgba(${r | 0},${g | 0},${b | 0},${op})`
        grad.addColorStop(0, col(0))
        grad.addColorStop(0.5, col(alpha * prox))
        grad.addColorStop(1, col(0))
        ctx.strokeStyle = grad
        ctx.lineWidth = 0.6 + prox * 1.4
        ctx.beginPath()
        ctx.moveTo(cx - R, y)
        ctx.lineTo(cx + R, y)
        ctx.stroke()
      }
    }

    // One soft radial blob with a gaussian falloff (no hard mid-ring → no
    // visible banding) and a gentle two-tone shift: core color `c1` melting
    // into `c2` toward the edge for a richer, retouched gradient aura.
    const EDGE = Math.exp(-3.6) // gaussian value at the rim, subtracted to reach true 0
    const blob = (
      x: number,
      y: number,
      radius: number,
      c1: [number, number, number],
      c2: [number, number, number],
      a: number,
    ) => {
      const grad = ctx.createRadialGradient(x, y, 0, x, y, radius)
      const STEPS = 12
      for (let s = 0; s <= STEPS; s++) {
        const t = s / STEPS
        const fall = (Math.exp(-3.6 * t * t) - EDGE) / (1 - EDGE)
        const r = c1[0] + (c2[0] - c1[0]) * t
        const g = c1[1] + (c2[1] - c1[1]) * t
        const b = c1[2] + (c2[2] - c1[2]) * t
        grad.addColorStop(t, `rgba(${r | 0},${g | 0},${b | 0},${(a * Math.max(0, fall)).toFixed(4)})`)
      }
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.fill()
    }

    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)

      field += ((pointer.active ? 1 : 0) - field) * 0.07
      if (field < 0.01 && !pointer.active) {
        ctx.clearRect(0, 0, width, height)
        return
      }

      // The aura sticks to the pointer — no spring, no lag, no trail.
      const cx = pointer.x
      const cy = pointer.y
      const c1 = ORANGE_CORE
      const c2 = ORANGE_EDGE
      const vis = field // static opacity (only fades in/out over UI)

      ctx.clearRect(0, 0, width, height)
      ctx.globalCompositeOperation = 'lighter'

      // Reactive grid glow under the aura.
      drawGrid(cx, cy, c1[0], c1[1], c1[2], 0.22 * vis)

      // A single soft orange glow centered on the cursor.
      blob(cx, cy, 150, c1, c2, 0.10 * vis)
      blob(cx, cy, 95, c1, c2, 0.14 * vis)

      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
    }

    const onVisibility = () => {
      cancelAnimationFrame(raf)
      if (!document.hidden) raf = requestAnimationFrame(tick)
    }

    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerout', onLeave)
    document.addEventListener('mouseleave', onLeave)
    document.addEventListener('visibilitychange', onVisibility)
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerout', onLeave)
      document.removeEventListener('mouseleave', onLeave)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[1]" />
}
