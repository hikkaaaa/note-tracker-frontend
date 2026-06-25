import { CursorField } from './CursorField'

/* The signature app canvas: three soft color halos + a masked copybook grid,
   plus the orange cursor aura that follows the pointer.
   Originally inlined on the dashboard; shared here so every page sits on the
   same background. Render it as the first child of a `relative` page root and
   wrap the page content in `relative z-[1]` so it stacks above. The grid reads
   the themed `--grid-line` token, so it recolors with light/dark/pink. */
export function PageBackdrop() {
  return (
    <>
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden print:hidden">
      <div className="absolute rounded-full" style={{ width: 600, height: 600, top: -120, left: -160, background: 'rgba(219,62,140,0.08)', filter: 'blur(90px)' }} />
      <div className="absolute rounded-full" style={{ width: 720, height: 720, top: '25%', right: -240, background: 'rgba(119,88,163,0.10)', filter: 'blur(90px)' }} />
      <div className="absolute rounded-full" style={{ width: 500, height: 500, bottom: -180, left: '30%', background: 'rgba(246,196,92,0.08)', filter: 'blur(90px)' }} />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          maskImage: 'radial-gradient(ellipse at center, black 25%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 25%, transparent 75%)',
          opacity: 0.5,
        }}
      />
    </div>
    <CursorField />
    </>
  )
}
