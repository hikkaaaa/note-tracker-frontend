import { useEffect, useMemo, useRef, useState } from 'react'
import { X, Share2, Check, FileText, Loader2 } from 'lucide-react'
import type { LocalFolder, LocalNote } from '../lib/localWorkspace'
import { shareResource } from '../lib/workspace'
import { getSwatch } from '../lib/folderColors'

const bricolage = "'Quicksand', sans-serif"

/* Share a folder — or a subset of its notes — with another user by nickname.
   Launched from a folder's ••• menu (full folder or partial), or from a single note's
   ••• menu (`singleNote` set → the share is locked to that one note). On success the
   backend creates a PENDING share the recipient accepts from their notifications. */
export function ShareModal({
  folder,
  singleNote,
  onClose,
  onShared,
}: {
  folder: LocalFolder
  singleNote?: LocalNote | null
  onClose: () => void
  onShared?: (recipient: string) => void
}) {
  const notes = folder.notes
  const [nickname, setNickname] = useState('')
  // Master toggle. ON = full-folder share (all notes, incl. future). Locked OFF in single-note mode.
  const [shareAll, setShareAll] = useState(!singleNote)
  // Which notes are checked when not sharing the whole folder.
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(singleNote ? [singleNote.id] : notes.map((n) => n.id)),
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const nicknameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => nicknameRef.current?.focus(), 50)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey) }
  }, [onClose])

  const sw = getSwatch(folder.color)
  const isSingle = Boolean(singleNote)

  const toggleNote = (id: number) => {
    setSelected((cur) => {
      const next = new Set(cur)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  // Notes actually being shared: everything for a full share, else the checked subset
  // (always exactly the one note in single-note mode).
  const chosenIds = useMemo(() => {
    if (isSingle) return singleNote ? [singleNote.id] : []
    if (shareAll) return notes.map((n) => n.id)
    return notes.filter((n) => selected.has(n.id)).map((n) => n.id)
  }, [isSingle, singleNote, shareAll, notes, selected])

  const canSubmit = nickname.trim().length > 0 && chosenIds.length > 0 && !busy

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setBusy(true)
    setError(null)
    try {
      await shareResource({
        recipientNickname: nickname.trim(),
        folderId: folder.id,
        // A full-folder share only when the master toggle is on AND we're not scoped to one note.
        fullFolder: !isSingle && shareAll,
        noteIds: chosenIds,
      })
      onShared?.(nickname.trim())
      onClose()
    } catch (err) {
      setError((err as Error)?.message ?? 'Could not share that.')
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-6"
      style={{ backgroundColor: 'rgba(27, 19, 38, 0.45)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
        className="relative flex max-h-[calc(100vh-48px)] w-full max-w-[520px] flex-col overflow-hidden rounded-3xl bg-[var(--surface)] shadow-[0_30px_80px_-20px_rgba(15,23,42,0.35)] animate-modal-in"
        style={{ fontFamily: "'Poppins', ui-sans-serif, sans-serif", color: 'var(--text-primary)' }}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 pb-5 pt-[22px]">
          <div className="flex items-center gap-3.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: sw.tint }}>
              <Share2 className="h-[24px] w-[24px]" style={{ color: sw.swatch }} strokeWidth={2.2} />
            </span>
            <div>
              <h2 id="share-modal-title" className="m-0 text-[22px] font-extrabold tracking-[-0.025em]" style={{ fontFamily: bricolage }}>
                Share
              </h2>
              <p className="m-0 mt-0.5 max-w-[340px] truncate text-[13px] text-[var(--text-secondary)]">
                {isSingle ? `Note · ${singleNote?.title || 'Untitled'}` : folder.name}
              </p>
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

        <form onSubmit={submit} className="flex min-h-0 flex-col gap-5 px-6 pb-6 pt-[22px]">
          <div className="flex flex-col gap-2">
            <label htmlFor="share-nickname" className="text-[15px] font-bold tracking-[-0.01em]">
              Recipient nickname <span className="text-[#4F46E5]">*</span>
            </label>
            <input
              ref={nicknameRef}
              id="share-nickname"
              type="text"
              placeholder="e.g. alex"
              value={nickname}
              maxLength={50}
              onChange={(e) => { setNickname(e.target.value); setError(null) }}
              className="w-full rounded-xl border-[1.5px] border-transparent bg-[#F4F5F8] px-3.5 py-3 text-[15px] outline-none transition-all placeholder:text-[#94A3B8] focus:border-[#4F46E5] focus:bg-[var(--surface)] focus:ring-4 focus:ring-[#4F46E5]/15"
            />
          </div>

          {!isSingle && (
            <>
              {/* master toggle: full folder vs pick notes */}
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3">
                <span className="flex flex-col">
                  <span className="text-[14px] font-bold tracking-[-0.01em]">Select all notes</span>
                  <span className="text-[12.5px] text-[var(--text-secondary)]">
                    {shareAll ? 'Sharing the whole folder' : 'Choose which notes to share'}
                  </span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={shareAll}
                  onClick={() => setShareAll((v) => !v)}
                  className={`relative h-[26px] w-[46px] flex-shrink-0 rounded-full transition-colors ${shareAll ? 'bg-[#4F46E5]' : 'bg-[#CBD2E0]'}`}
                >
                  <span className={`absolute top-[3px] h-5 w-5 rounded-full bg-white shadow transition-all ${shareAll ? 'left-[23px]' : 'left-[3px]'}`} />
                </button>
              </label>

              {/* per-note checklist, shown only when not sharing the whole folder */}
              {!shareAll && (
                <div className="flex flex-col gap-2">
                  <span className="text-[13px] font-semibold text-[var(--text-secondary)]">
                    {chosenIds.length} of {notes.length} selected
                  </span>
                  <div className="flex max-h-[220px] flex-col gap-1.5 overflow-y-auto rounded-xl border border-[var(--border-subtle)] p-2 scrollbar-slim">
                    {notes.length === 0 ? (
                      <p className="px-2 py-3 text-center text-[13px] text-[var(--text-secondary)]">This folder has no notes yet.</p>
                    ) : notes.map((n) => {
                      const on = selected.has(n.id)
                      return (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => toggleNote(n.id)}
                          className={`flex items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors ${on ? 'bg-[#4F46E5]/[0.07]' : 'hover:bg-[var(--text-primary)]/[0.04]'}`}
                        >
                          <span className={`grid h-[20px] w-[20px] flex-shrink-0 place-items-center rounded-[6px] border-[1.5px] transition-colors ${on ? 'border-[#4F46E5] bg-[#4F46E5] text-white' : 'border-[var(--border-subtle)]'}`}>
                            {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                          </span>
                          <FileText className="h-4 w-4 flex-shrink-0 text-[var(--text-secondary)]" />
                          <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{n.title || 'Untitled'}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {error && (
            <p className="rounded-lg border border-[#DB3E8C]/25 bg-[#DB3E8C]/[0.07] px-3 py-2 text-sm font-medium text-[#B91C57]">
              {error}
            </p>
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
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--btn-primary-bg)] px-[22px] py-[11px] text-sm font-bold text-white shadow-[0_8px_16px_-6px_rgba(79,70,229,0.45)] transition-transform hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy ? 'Sharing…' : 'Share'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
