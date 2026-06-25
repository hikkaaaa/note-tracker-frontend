import { useState, useEffect, useRef } from 'react'
import { X, NotebookPen } from 'lucide-react'
import type { FolderColor, LocalFolder } from '../lib/localWorkspace'
import { COLOR_ORDER, FOLDER_SWATCHES } from '../lib/folderColors'

interface CreateFolderModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit?: (folder: FormState) => void
  onSuccess?: () => void
  initialFolder?: LocalFolder | null
}

export interface FormState {
  name: string
  purpose: string
  color: FolderColor
}

const NAME_CHAR_LIMIT = 40
const DESC_CHAR_LIMIT = 120

const bricolage = "'Quicksand', sans-serif"

export function CreateFolderModal({ isOpen, onClose, onSubmit, onSuccess, initialFolder }: CreateFolderModalProps) {
  const [form, setForm] = useState<FormState>({ name: '', purpose: '', color: 'violet' })
  const [error, setError] = useState<string | null>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const isEditing = Boolean(initialFolder)

  // Reset + focus the name input when the modal opens
  useEffect(() => {
    if (isOpen) {
      setForm({
        name: initialFolder?.name ?? '',
        purpose: initialFolder?.purpose ?? '',
        color: initialFolder?.color ?? 'violet',
      })
      setError(null)
      setTimeout(() => nameInputRef.current?.focus(), 50)
    }
  }, [initialFolder, isOpen])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const descChars = form.purpose.length
  const overLimit = descChars > DESC_CHAR_LIMIT
  const canSubmit = form.name.trim().length > 0 && !overLimit

  const handleDescChange = (value: string) => {
    setForm((f) => ({ ...f, purpose: value.slice(0, DESC_CHAR_LIMIT) }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Folder name is required.')
      return
    }
    setError(null)
    if (onSubmit) {
      onSubmit({ name: form.name.trim(), purpose: form.purpose.trim(), color: form.color })
    } else {
      onSuccess?.()
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      id="create-folder-backdrop"
      className="fixed inset-0 z-[200] flex items-center justify-center p-6"
      style={{ backgroundColor: 'rgba(27, 19, 38, 0.45)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        id="create-folder-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="relative max-h-[calc(100vh-48px)] w-full max-w-[560px] overflow-y-auto rounded-3xl bg-[var(--surface)] shadow-[0_30px_80px_-20px_rgba(15,23,42,0.35)] animate-modal-in"
        style={{ fontFamily: "'Poppins', ui-sans-serif, sans-serif", color: 'var(--text-primary)' }}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 pb-5 pt-[22px]">
          <div className="flex items-center gap-3.5">
            <span
              className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl"
              style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.14), rgba(236,72,153,0.10))' }}
            >
              <NotebookPen className="h-[26px] w-[26px] text-[#8B5CF6]" strokeWidth={2.2} />
            </span>
            <h2 id="modal-title" className="m-0 text-[22px] font-extrabold tracking-[-0.025em]" style={{ fontFamily: bricolage }}>
              {isEditing ? 'Edit Folder' : 'New Folder'}
            </h2>
          </div>
          <button
            id="close-modal-btn"
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-9 w-9 items-center justify-center rounded-[10px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)]"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        <form id="create-folder-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-5 px-6 pb-6 pt-[22px]">
          <div className="flex flex-col gap-2">
            <label htmlFor="folder-name" className="text-[15px] font-bold tracking-[-0.01em]">
              Folder Name <span className="text-[#F99A00]">*</span>
            </label>
            <input
              ref={nameInputRef}
              id="folder-name"
              type="text"
              placeholder="e.g. Research Notes"
              value={form.name}
              maxLength={NAME_CHAR_LIMIT}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-xl border-[1.5px] border-transparent bg-[#F4F5F8] px-3.5 py-3 text-[15px] outline-none transition-all placeholder:text-[#94A3B8] focus:border-[#8B5CF6] focus:bg-[var(--surface)] focus:ring-4 focus:ring-[#8B5CF6]/15"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="folder-purpose" className="text-[15px] font-bold tracking-[-0.01em]">
                Folder Description <span className="ml-1 text-sm font-medium text-[var(--text-secondary)]">(optional)</span>
              </label>
              <span className={`font-mono text-[11px] ${overLimit ? 'font-semibold text-[#EC4899]' : 'text-[var(--text-secondary)]'}`}>
                {descChars}/{DESC_CHAR_LIMIT}
              </span>
            </div>
            <textarea
              id="folder-purpose"
              rows={3}
              placeholder="e.g. Collecting notes for Q2 market research"
              value={form.purpose}
              onChange={(e) => handleDescChange(e.target.value)}
              className="min-h-[96px] w-full resize-y rounded-xl border-[1.5px] border-transparent bg-[#F4F5F8] px-3.5 py-3 text-[15px] leading-relaxed outline-none transition-all placeholder:text-[#94A3B8] focus:border-[#8B5CF6] focus:bg-[var(--surface)] focus:ring-4 focus:ring-[#8B5CF6]/15"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[15px] font-bold tracking-[-0.01em]">Folder Color</label>
            <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Folder color">
              {COLOR_ORDER.map((id) => {
                const sw = FOLDER_SWATCHES[id]
                const selected = form.color === id
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={sw.label}
                    title={sw.label}
                    onClick={() => setForm((current) => ({ ...current, color: id }))}
                    className={`h-[38px] w-[38px] rounded-full border-[3px] border-white p-0 transition-transform ${selected ? '' : 'hover:scale-110'}`}
                    style={{
                      backgroundColor: sw.swatch,
                      outline: selected ? `2px solid ${sw.swatch}` : '2px solid transparent',
                      outlineOffset: '2px',
                      boxShadow: selected ? `0 4px 10px -2px ${sw.swatch}` : '0 1px 3px rgba(15,23,42,0.10)',
                    }}
                  />
                )
              })}
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-500">
              {error}
            </p>
          )}

          <div className="mt-1 flex items-center justify-end gap-2.5">
            <button
              type="button"
              id="cancel-btn"
              onClick={onClose}
              className="rounded-xl border-[1.5px] border-[var(--border-subtle)] bg-[var(--surface)] px-[22px] py-[11px] text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[#F4F5F8]"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="create-folder-submit-btn"
              disabled={!canSubmit}
              className="rounded-xl bg-[#8B5CF6] px-[22px] py-[11px] text-sm font-bold text-white shadow-[0_8px_16px_-6px_rgba(139,92,246,0.45)] transition-transform hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0"
            >
              {isEditing ? 'Save Changes' : 'Create Folder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
