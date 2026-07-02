import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// One row in a card's ••• menu.
export interface CardMenuItem {
  key: string
  label: string
  icon: React.ReactNode
  /** Tailwind classes for the small icon chip (bg + text color). */
  chipClass?: string
  danger?: boolean
  onSelect: () => void
}

const PANEL_W = 184

/* A ••• action menu whose panel is rendered through a portal into <body>, so it can never
   be clipped by an ancestor's `overflow: hidden` (folder/note cards clip their color wash,
   which previously cut off the top of an upward-opening menu). The panel is anchored to the
   trigger button via fixed positioning and flips above/below depending on available space.
   Open state stays owned by the parent (so only one card's menu is open at a time). */
export function CardActionMenu({
  items,
  ariaLabel,
  open,
  onToggle,
  onClose,
  triggerClass,
  children,
}: {
  items: CardMenuItem[]
  ariaLabel: string
  open: boolean
  onToggle: () => void
  onClose: () => void
  triggerClass: string
  children: React.ReactNode
}) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

  // Position the panel against the trigger, re-running on scroll/resize while open.
  useLayoutEffect(() => {
    if (!open) return
    const update = () => {
      const b = btnRef.current
      if (!b) return
      const r = b.getBoundingClientRect()
      const panelH = items.length * 46 + 14
      const left = Math.max(8, Math.min(r.right - PANEL_W, window.innerWidth - PANEL_W - 8))
      const top = r.top > panelH + 16 ? r.top - panelH - 8 : Math.min(r.bottom + 8, window.innerHeight - panelH - 8)
      setPos({ left, top })
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open, items.length])

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node
      if (panelRef.current?.contains(t) || btnRef.current?.contains(t)) return
      onClose()
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle() }}
        className={triggerClass}
      >
        {children}
      </button>
      {open && pos && createPortal(
        <div
          ref={panelRef}
          role="menu"
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'fixed', left: pos.left, top: pos.top, width: PANEL_W }}
          className="z-[300] flex flex-col gap-0.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-1.5 text-[var(--text-primary)] shadow-[0_10px_24px_-8px_rgba(27,19,38,0.18),0_24px_60px_-20px_rgba(27,19,38,0.30)] animate-modal-in"
        >
          {items.map((it) => (
            <button
              key={it.key}
              type="button"
              role="menuitem"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); it.onSelect() }}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] font-semibold transition-colors ${
                it.danger ? 'text-[#B91C1C] hover:bg-[#DC2626]/[0.08]' : 'text-[var(--text-primary)] hover:bg-[#4F46E5]/[0.08]'
              }`}
            >
              <span className={`grid h-[22px] w-[22px] place-items-center rounded-md ${it.chipClass ?? 'bg-[#4F46E5]/10 text-[#4F46E5]'}`}>
                {it.icon}
              </span>
              {it.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  )
}
