import { useState, useEffect, useRef } from 'react'
import { X, NotebookPen } from 'lucide-react'
import type { FolderColor } from '../lib/localWorkspace'
import { getSwatch } from '../lib/folderColors'

export interface FormState {
  name: string
  purpose: string
}

export interface NoteInitial {
  title: string
  purpose?: string
}

interface CreateNoteModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (form: FormState) => void
  folderName: string
  folderColor: FolderColor
  initialNote?: NoteInitial | null
}

const NAME_LIMIT = 60
const PURPOSE_LIMIT = 140
const bricolage = "'Quicksand', sans-serif"

export function CreateNoteModal({
  isOpen,
  onClose,
  onSubmit,
  folderName,
  folderColor,
  initialNote,
}: CreateNoteModalProps) {
  const isEdit = Boolean(initialNote)
  const [name, setName] = useState('')
  const [purpose, setPurpose] = useState('')
  const [error, setError] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) return
    setName(initialNote?.title ?? '')
    setPurpose(initialNote?.purpose && initialNote.purpose !== '—' ? initialNote.purpose : '')
    setError(null)
    setTimeout(() => nameRef.current?.focus(), 50)
  }, [isOpen, initialNote])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const folderSw = getSwatch(folderColor)
  const purposeChars = purpose.length
  const overLimit = purposeChars > PURPOSE_LIMIT
  const canSubmit = name.trim().length > 0 && !overLimit

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Note name is required.')
      return
    }
    onSubmit({ name: name.trim(), purpose: purpose.trim() })
    onClose()
  }

  return (
    <div
      id="create-note-backdrop"
      className="fixed inset-0 z-[200] flex items-center justify-center p-6"
      style={{ backgroundColor: 'rgba(27, 19, 38, 0.45)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        id="create-note-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-note-title"
        className="relative max-h-[calc(100vh-48px)] w-full max-w-[560px] overflow-y-auto rounded-3xl bg-[var(--surface)] shadow-[0_30px_80px_-20px_rgba(15,23,42,0.35)] animate-modal-in"
        style={{ fontFamily: "'Poppins', ui-sans-serif, sans-serif", color: 'var(--text-primary)', ['--accent' as string]: folderSw.swatch, ['--accent-tint' as string]: folderSw.tint } as React.CSSProperties}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 pb-5 pt-[22px]">
          <div className="flex items-center gap-3.5">
            <span
              className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl"
              style={{ background: `linear-gradient(135deg, ${folderSw.tint}, rgba(236,72,153,0.10))` }}
            >
              <NotebookPen className="h-[26px] w-[26px]" strokeWidth={2.2} style={{ color: 'var(--accent)' }} />
            </span>
            <div>
              <h2 id="new-note-title" className="m-0 text-[22px] font-extrabold tracking-[-0.025em]" style={{ fontFamily: bricolage }}>
                {isEdit ? 'Edit Note' : 'New Note'}
              </h2>
              <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
                in{' '}
                <span
                  className="ml-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-xs font-bold"
                  style={{ background: folderSw.tint, color: folderSw.swatch }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: folderSw.swatch }} />
                  {folderName}
                </span>
              </p>
            </div>
          </div>
          <button
            id="close-modal-btn"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-[10px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)]"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5 px-6 pb-6 pt-[22px]">
          <div className="flex flex-col gap-2">
            <label htmlFor="note-name" className="text-[15px] font-bold tracking-[-0.01em]">
              Note Name <span className="text-[#F99A00]">*</span>
            </label>
            <input
              ref={nameRef}
              id="note-name"
              type="text"
              placeholder="e.g. Q1 Marketing Plan"
              value={name}
              maxLength={NAME_LIMIT}
              onChange={(e) => setName(e.target.value)}
              className="bloom-field w-full rounded-xl border-[1.5px] border-transparent bg-[#F4F5F8] px-3.5 py-3 text-[15px] outline-none placeholder:text-[#94A3B8]"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="note-purpose" className="text-[15px] font-bold tracking-[-0.01em]">
                Purpose <span className="ml-1 text-sm font-medium text-[var(--text-secondary)]">(optional)</span>
              </label>
              <span className={`font-mono text-[11px] ${overLimit ? 'font-semibold text-[#EC4899]' : 'text-[var(--text-secondary)]'}`}>
                {purposeChars}/{PURPOSE_LIMIT}
              </span>
            </div>
            <textarea
              id="note-purpose"
              rows={3}
              placeholder="e.g. Brainstorming session for the new campaign"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value.slice(0, PURPOSE_LIMIT))}
              className="bloom-field min-h-[96px] w-full resize-y rounded-xl border-[1.5px] border-transparent bg-[#F4F5F8] px-3.5 py-3 text-[15px] leading-relaxed outline-none placeholder:text-[#94A3B8]"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-500">{error}</p>
          )}

          <div className="mt-1 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border-[1.5px] border-[var(--border-subtle)] bg-[var(--surface)] px-[22px] py-[11px] text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[#F4F5F8]"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="create-note-submit-btn"
              disabled={!canSubmit}
              className="rounded-xl px-[22px] py-[11px] text-sm font-bold text-white transition-transform hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background: folderSw.swatch,
                boxShadow: canSubmit ? `0 8px 16px -6px ${folderSw.swatch}80` : 'none',
              }}
            >
              {isEdit ? 'Save Changes' : 'Create Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
