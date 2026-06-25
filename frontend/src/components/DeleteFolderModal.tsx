import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Trash2, X } from 'lucide-react'
import type { LocalFolder } from '../lib/localWorkspace'
import { getSwatch } from '../lib/folderColors'

interface DeleteFolderModalProps {
  folder: LocalFolder
  onClose: () => void
  onConfirm: () => void
}

const bricolage = "'Quicksand', sans-serif"

export function DeleteFolderModal({ folder, onClose, onConfirm }: DeleteFolderModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const sw = getSwatch(folder.color)
  const noteCount = folder.notes.length

  const content = (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-6"
      style={{ backgroundColor: 'rgba(27, 19, 38, 0.45)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        className="relative w-full max-w-[480px] overflow-hidden rounded-3xl bg-[var(--surface)] shadow-[0_30px_80px_-20px_rgba(15,23,42,0.35)] animate-modal-in"
        style={{ fontFamily: "'Poppins', ui-sans-serif, sans-serif", color: 'var(--text-primary)' }}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 pb-5 pt-[22px]">
          <div className="flex items-center gap-3.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#DC2626]/10 text-[#DC2626]">
              <Trash2 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="m-0 text-[22px] font-extrabold tracking-[-0.025em]" style={{ fontFamily: bricolage }}>
                Delete folder?
              </h2>
              <p className="mt-1 text-[13px] text-[var(--text-secondary)]">This action can't be undone.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-[10px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)]"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="flex flex-col gap-5 px-6 pb-6 pt-[22px]">
          <div className="flex items-center gap-3.5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--text-primary)]/[0.03] p-3.5">
            <span
              className="h-11 w-11 flex-shrink-0 rounded-xl"
              style={{ background: sw.back, boxShadow: `0 6px 16px -6px ${sw.halo}` }}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-base font-extrabold tracking-[-0.015em]" style={{ fontFamily: bricolage }}>
                {folder.name}
              </div>
              <div className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">
                {noteCount} {noteCount === 1 ? 'note' : 'notes'} · {folder.purpose || 'No description'}
              </div>
            </div>
          </div>

          <p className="m-0 text-[13px] leading-relaxed text-[var(--text-secondary)]">
            Everything inside this folder will be moved to <b className="text-[var(--text-primary)]">Trash</b>. You can restore it within 30 days.
          </p>

          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border-[1.5px] border-[var(--border-subtle)] bg-[var(--surface)] px-[22px] py-[11px] text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[#F4F5F8]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => { onConfirm(); onClose() }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#DC2626] px-[18px] py-[11px] text-sm font-bold text-white shadow-[0_8px_16px_-6px_rgba(220,38,38,0.45)] transition-transform hover:-translate-y-px"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete folder
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
