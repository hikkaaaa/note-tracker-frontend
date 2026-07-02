import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Star, Pin, PinOff } from 'lucide-react'
import { CreateNoteModal } from '../components/CreateNoteModal'
import type { FormState as NoteFormState, NoteInitial } from '../components/CreateNoteModal'
import { DeleteNoteModal } from '../components/DeleteNoteModal'
import { fetchFolder, createNote, updateNote, deleteNote } from '../lib/workspace'
import { getAuthToken } from '../lib/authToken'
import type { FolderColor, LocalFolder, LocalNote } from '../lib/localWorkspace'
import { getSwatch } from '../lib/folderColors'
import { PageBackdrop } from '../components/PageBackdrop'

const bricolage = "'Quicksand', sans-serif"
const geist = "'Poppins', ui-sans-serif, sans-serif"

/* ---------- inline icons (match the design) ---------- */
const ArrowLeft = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
)
const PlusIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)
const SearchIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)
const MoreIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="5" cy="12" r="1.4" fill="currentColor" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" />
    <circle cx="19" cy="12" r="1.4" fill="currentColor" />
  </svg>
)
const SortIcon = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h13" />
    <path d="M3 12h9" />
    <path d="M3 18h5" />
    <path d="M17 9l3-3 3 3" />
    <path d="M20 6v14" />
  </svg>
)
const EditIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z" />
  </svg>
)
const TrashIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
  </svg>
)

/* ---------- helpers ---------- */
// The backend sends naive UTC timestamps (no zone suffix). Tag them as UTC before parsing,
// otherwise the browser reads them as local time and dates/recency are off by the user's
// timezone offset.
function parseServerDate(iso?: string): number {
  if (!iso) return NaN
  const hasZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso)
  return new Date(hasZone ? iso : `${iso}Z`).getTime()
}

function formatDate(iso?: string) {
  const t = parseServerDate(iso)
  if (Number.isNaN(t)) return ''
  const d = new Date(t)
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`
}

const PAPERS = ['lined', 'grid', 'dot'] as const
const PREVIEW_SETS = [
  [82, 95, 70, 88, 60],
  [90, 72, 88, 64],
  [60, 86, 92, 70, 76],
  [88, 64, 78],
  [70, 90, 60, 85, 72, 80],
  [85, 78, 92, 64],
]

// deterministic paper texture + preview lines from a note id (no model fields needed)
function noteVisuals(id: number) {
  const n = Math.abs(id)
  return { paper: PAPERS[n % PAPERS.length], preview: PREVIEW_SETS[n % PREVIEW_SETS.length] }
}

const PAPER_BG: Record<(typeof PAPERS)[number], { backgroundImage: string; backgroundSize?: string; opacity: number }> = {
  lined: {
    backgroundImage:
      'repeating-linear-gradient(to bottom, transparent 0px, transparent 21px, var(--note-texture) 21px, var(--note-texture) 22px)',
    opacity: 0.5,
  },
  grid: {
    backgroundImage:
      'linear-gradient(var(--note-texture) 1px, transparent 1px), linear-gradient(90deg, var(--note-texture) 1px, transparent 1px)',
    backgroundSize: '18px 18px',
    opacity: 0.5,
  },
  dot: {
    backgroundImage: 'radial-gradient(circle, var(--note-texture) 1px, transparent 1.5px)',
    backgroundSize: '18px 18px',
    opacity: 0.35,
  },
}

type SortMode = 'recent' | 'name'
const FILTERS = ['All', 'Recent', 'Starred'] as const
type NoteFilter = (typeof FILTERS)[number]

// "Recent" = edited in the last 14 days (note or any of its blocks).
const RECENT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000
function isRecentNote(iso: string, now: number): boolean {
  if (!iso) return false
  const t = parseServerDate(iso)
  return !Number.isNaN(t) && now - t <= RECENT_WINDOW_MS
}
function noteTime(iso: string): number {
  const t = parseServerDate(iso)
  return Number.isNaN(t) ? 0 : t
}

export function FolderDetailPage() {
  const { folderId } = useParams()
  const navigate = useNavigate()
  const [folder, setFolder] = useState<LocalFolder | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<NoteFilter>('All')
  const [sortBy, setSortBy] = useState<SortMode>('recent')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<LocalNote | null>(null)
  const [deletingNote, setDeletingNote] = useState<LocalNote | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null)

  const fetchFolderData = useCallback(async () => {
    if (!folderId) return
    try {
      const data = await fetchFolder(parseInt(folderId))
      setFolder(data)
    } catch {
      setFolder(null)
    } finally {
      setLoaded(true)
    }
  }, [folderId])

  // Gate behind a session, then load this folder (with its notes) from the backend.
  useEffect(() => {
    if (!getAuthToken()) {
      navigate('/login', { replace: true })
      return
    }
    fetchFolderData()
  }, [fetchFolderData, navigate])

  const accent = getSwatch(folder?.color ?? 'violet')
  const notes = useMemo(() => folder?.notes ?? [], [folder])

  const matchesNoteFilter = useCallback((n: LocalNote, f: NoteFilter, now: number) => {
    if (f === 'Starred') return n.starred
    if (f === 'Recent') return isRecentNote(n.updated_at, now)
    return true
  }, [])

  // Counts for the filter pills (search-independent).
  const filterCounts = useMemo(() => {
    const now = Date.now()
    return Object.fromEntries(
      FILTERS.map((f) => [f, notes.filter((n) => matchesNoteFilter(n, f, now)).length]),
    ) as Record<NoteFilter, number>
  }, [notes, matchesNoteFilter])

  const filtered = useMemo(() => {
    const now = Date.now()
    let xs = notes.filter((n) => matchesNoteFilter(n, filter, now))
    const k = q.trim().toLowerCase()
    if (k) {
      xs = xs.filter(
        (n) => n.title.toLowerCase().includes(k) || (n.purpose ?? '').toLowerCase().includes(k),
      )
    }
    // Pinned notes always float to the top; within each group, sort by name or recency.
    return [...xs].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      if (sortBy === 'name') return a.title.localeCompare(b.title)
      return noteTime(b.updated_at) - noteTime(a.updated_at)
    })
  }, [notes, q, sortBy, filter, matchesNoteFilter])

  const openCreate = () => {
    setEditingNote(null)
    setIsModalOpen(true)
  }

  const handleSubmit = async (form: NoteFormState) => {
    if (!folderId) return
    try {
      if (editingNote) {
        await updateNote(editingNote.id, { title: form.name, purpose: form.purpose })
      } else {
        await createNote(parseInt(folderId), { title: form.name, purpose: form.purpose })
      }
      setEditingNote(null)
      await fetchFolderData()
    } catch {
      setEditingNote(null)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingNote) return
    try {
      await deleteNote(deletingNote.id)
      await fetchFolderData()
    } catch {
      /* leave the note in place if the delete failed */
    }
  }

  // Optimistically toggle a note flag (star / pin), rolling back if the write fails.
  const patchNoteFlag = async (note: LocalNote, patch: { starred?: boolean; pinned?: boolean }) => {
    setMenuOpenId(null)
    const apply = (n: LocalNote) => (n.id === note.id ? { ...n, ...patch } : n)
    setFolder((cur) => (cur ? { ...cur, notes: cur.notes.map(apply) } : cur))
    try {
      await updateNote(note.id, patch)
    } catch {
      setFolder((cur) => (cur ? { ...cur, notes: cur.notes.map((n) => (n.id === note.id ? note : n)) } : cur))
    }
  }
  const handleToggleStar = (note: LocalNote) => patchNoteFlag(note, { starred: !note.starred })
  const handleTogglePin = (note: LocalNote) => patchNoteFlag(note, { pinned: !note.pinned })

  const isEmpty = notes.length === 0
  const modalInitial: NoteInitial | null = editingNote
    ? { title: editingNote.title, purpose: editingNote.purpose }
    : null

  if (loaded && !folder) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center gap-3 overflow-hidden" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: geist }}>
        <PageBackdrop cursor={false} />
        <p className="relative z-[1] text-lg font-semibold">Folder not found</p>
        <Link to="/dashboard" className="bg-[var(--btn-primary-bg)] relative z-[1] rounded-full px-5 py-2.5 text-sm font-semibold text-[var(--btn-primary-text)]">
          Back to folders
        </Link>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: geist }}>
      <PageBackdrop cursor={false} />
      <div
        id="folder-detail-page"
        className="relative z-[1] mx-auto max-w-[1440px] px-5 pb-20 pt-4 sm:px-10 sm:pt-6"
        style={{ ['--accent' as string]: accent.swatch, ['--accent-tint' as string]: accent.tint } as React.CSSProperties}
      >
        {/* breadcrumb / sub-topbar */}
        <header className="relative z-[5] mb-[30px] flex items-center gap-[18px] py-2.5">
          <Link
            to="/dashboard"
            aria-label="Back to folders"
            className="bloom-backbtn grid h-[42px] w-[42px] place-items-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-primary)] shadow-[0_8px_22px_-16px_rgba(27,19,38,0.2)]"
          >
            <ArrowLeft />
          </Link>
          <div className="flex items-center gap-2.5 text-sm font-medium">
            <Link to="/dashboard" className="px-1 py-1.5 text-[var(--text-secondary)] no-underline transition-colors hover:text-[var(--text-primary)]">
              Folders
            </Link>
            <span className="text-[var(--text-secondary)] opacity-40">/</span>
            <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-bold tracking-[-0.005em]" style={{ background: accent.tint, color: accent.swatch }}>
              <span className="h-2 w-2 rounded-full" style={{ background: accent.swatch, boxShadow: '0 0 0 3px rgba(255,255,255,0.6)' }} />
              {folder?.name ?? '…'}
            </span>
          </div>
        </header>

        {/* action bar — the big "Notes" title is gone; the search + New Note controls now
            live in this space and stretch the full width of the page */}
        <section className="relative z-[3] mb-7">
          <p className="mb-3.5 text-sm tracking-[-0.005em] text-[var(--text-secondary)]">
            <b className="font-semibold text-[var(--text-primary)]">{notes.length}</b> {notes.length === 1 ? 'note' : 'notes'}
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="bloom-searchbox flex flex-1 items-center gap-2.5 rounded-[16px] border-[1.5px] border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3.5 shadow-[0_10px_28px_-16px_rgba(27,19,38,0.18)]">
              <span className="grid place-items-center text-[var(--text-secondary)]"><SearchIcon /></span>
              <input
                id="note-search"
                type="text"
                placeholder="Search notes…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-secondary)]"
              />
            </div>

            <button
              type="button"
              onClick={openCreate}
              className="bg-[var(--btn-primary-bg)] inline-flex shrink-0 items-center justify-center gap-2.5 rounded-full py-[14px] pl-2.5 pr-8 text-sm font-semibold text-[var(--btn-primary-text)] shadow-[0_14px_30px_-16px_rgba(27,19,38,0.5)] transition-transform hover:-translate-y-px"
            >
              <span className="grid h-[30px] w-[30px] place-items-center rounded-full bg-white/20 text-white">
                <PlusIcon size={13} />
              </span>
              New Note
            </button>
          </div>
        </section>

        {/* filter row */}
        {!isEmpty && (
          <div className="relative z-[3] mb-7 flex flex-col items-stretch justify-between gap-3 border-b border-dashed border-[var(--border-subtle)] pb-[18px] sm:flex-row sm:items-center sm:gap-[18px]">
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((label) => {
                const on = label === filter
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setFilter(label)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors ${
                      on
                        ? 'border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-primary)] shadow-[0_6px_18px_-12px_rgba(27,19,38,0.18)]'
                        : 'border-transparent text-[var(--text-secondary)] hover:bg-[#4F46E5]/[0.06] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {label === 'Starred' && <Star size={12} />}
                    {label}
                    {on && (
                      <span className="rounded-full px-1.5 py-0.5 text-[11px]" style={{ background: accent.tint, color: accent.swatch }}>
                        {filterCounts[label]}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            <button
              type="button"
              onClick={() => setSortBy((s) => (s === 'recent' ? 'name' : 'recent'))}
              title="Toggle sort"
              className="inline-flex items-center gap-1.5 self-end rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-3.5 py-2 text-[13px] text-[var(--text-secondary)] shadow-[0_6px_18px_-12px_rgba(27,19,38,0.18)] transition-colors hover:text-[var(--text-primary)] sm:self-auto"
            >
              <SortIcon size={13} /> Sort: <b className="font-semibold text-[var(--text-primary)]">{sortBy === 'recent' ? 'Recent' : 'Name'}</b>
            </button>
          </div>
        )}

        {isEmpty ? (
          <EmptyNotes accent={accent} onCreate={openCreate} />
        ) : filtered.length > 0 ? (
          <main className="relative z-[2] grid grid-cols-1 gap-[22px] sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {filtered.map((note, i) => (
              <NoteCard
                key={note.id}
                note={note}
                folderColor={folder!.color}
                tilt={(i % 5) - 2}
                menuOpen={menuOpenId === note.id}
                onMenuToggle={() => setMenuOpenId((id) => (id === note.id ? null : note.id))}
                onMenuClose={() => setMenuOpenId(null)}
                onOpen={() => navigate(`/notes/${note.id}`)}
                onEdit={() => { setEditingNote(note); setIsModalOpen(true); setMenuOpenId(null) }}
                onDelete={() => { setDeletingNote(note); setMenuOpenId(null) }}
                onToggleStar={() => handleToggleStar(note)}
                onTogglePin={() => handleTogglePin(note)}
              />
            ))}
          </main>
        ) : (
          <div className="py-12 text-center text-[var(--text-secondary)]">
            {q.trim() ? (
              <p>No notes match "<b className="text-[var(--text-primary)]">{q}</b>". Try a different search.</p>
            ) : filter === 'Starred' ? (
              <p>No starred notes yet. Tap the star on a note to keep it here.</p>
            ) : filter === 'Recent' ? (
              <p>Nothing edited in the last 14 days.</p>
            ) : (
              <p>No notes here yet.</p>
            )}
          </div>
        )}
      </div>

      {folder && (
        <CreateNoteModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setEditingNote(null) }}
          onSubmit={handleSubmit}
          folderName={folder.name}
          folderColor={folder.color}
          initialNote={modalInitial}
        />
      )}

      {deletingNote && (
        <DeleteNoteModal
          title={deletingNote.title}
          purpose={deletingNote.purpose}
          color={folder?.color ?? 'violet'}
          onClose={() => setDeletingNote(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  )
}

/* ---------- note card (paper) ---------- */
function NoteCard({
  note,
  folderColor,
  tilt,
  menuOpen,
  onMenuToggle,
  onMenuClose,
  onOpen,
  onEdit,
  onDelete,
  onToggleStar,
  onTogglePin,
}: {
  note: LocalNote
  folderColor: FolderColor
  tilt: number
  menuOpen: boolean
  onMenuToggle: () => void
  onMenuClose: () => void
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
  onToggleStar: () => void
  onTogglePin: () => void
}) {
  const sw = getSwatch(folderColor)
  const { paper, preview } = noteVisuals(note.id)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onMenuClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onMenuClose()
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen, onMenuClose])

  return (
    <article
      onClick={onOpen}
      className="note-paper-card group relative flex h-[280px] cursor-pointer flex-col overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface)] shadow-[0_1px_0_rgba(27,19,38,0.04),0_2px_6px_rgba(27,19,38,0.04),0_10px_24px_-12px_rgba(27,19,38,0.10)]"
      style={{ ['--tilt' as string]: `${tilt * 0.4}deg`, ['--accent' as string]: sw.swatch, ['--accent-tint' as string]: sw.tint } as React.CSSProperties}
    >
      {/* paper texture */}
      <div className="pointer-events-none absolute inset-0" style={PAPER_BG[paper]} />
      {/* color spine */}
      <div className="absolute bottom-0 left-0 top-0 w-[5px] opacity-85" style={{ background: sw.swatch }} />
      {/* folded corner */}
      <div
        className="absolute right-0 top-0 h-7 w-7"
        style={{
          background: 'linear-gradient(225deg, var(--note-fold) 0%, var(--note-fold) 50%, transparent 50%)',
          boxShadow: 'inset -2px 2px 4px var(--note-fold)',
        }}
      />

      {/* preview lines */}
      <div className="relative z-[1] flex flex-1 flex-col gap-2.5 px-[22px] pb-3.5 pt-[22px]">
        {preview.map((w, i) => (
          <div
            key={i}
            className="rounded-full"
            style={{ width: `${w}%`, height: i === 0 ? 9 : 7, background: i === 0 ? 'var(--note-ink-strong)' : 'var(--note-ink-soft)' }}
          />
        ))}
      </div>

      {/* body */}
      <div className="relative z-[1] border-t border-[var(--border-subtle)] px-[22px] pb-[18px] pt-3.5" style={{ background: 'var(--note-card-footer)' }}>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-[0.05em] text-[var(--text-secondary)]">
            {formatDate(note.created_at)}
          </span>
          <span className="flex items-center gap-1.5">
            {note.pinned && <Pin size={13} fill="currentColor" style={{ color: sw.swatch }} />}
            {note.starred && <Star size={13} fill="#F59E0B" color="#F59E0B" />}
          </span>
        </div>
        <h3 className="m-0 mb-1 truncate text-[20px] font-extrabold leading-[1.15] tracking-[-0.025em]" style={{ fontFamily: bricolage }}>
          {note.title}
        </h3>
        <p className="m-0 truncate pr-9 text-[13px] font-medium text-[var(--text-secondary)]">{note.purpose || '—'}</p>
      </div>

      {/* more menu */}
      <div className="absolute bottom-3.5 right-3.5 z-[5]" ref={menuRef}>
        <button
          type="button"
          aria-label={`${note.title} options`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMenuToggle() }}
          className={`note-more-btn grid h-[30px] w-[30px] place-items-center rounded-lg transition-all ${
            menuOpen ? 'bg-[var(--btn-primary-bg)]/[0.06] text-[var(--text-primary)] opacity-100' : 'text-[var(--text-secondary)] opacity-65 hover:bg-[var(--btn-primary-bg)]/[0.06] hover:text-[var(--text-primary)] hover:opacity-100'
          }`}
        >
          <MoreIcon size={16} />
        </button>
        {menuOpen && (
          <div
            role="menu"
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-[calc(100%+6px)] right-0 z-50 flex min-w-[160px] flex-col gap-0.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-1.5 shadow-[0_10px_24px_-8px_rgba(27,19,38,0.18),0_24px_60px_-20px_rgba(27,19,38,0.30)] animate-modal-in"
          >
            <button
              type="button"
              role="menuitem"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleStar() }}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] font-semibold text-[var(--text-primary)] transition-colors hover:bg-[#4F46E5]/[0.08]"
            >
              <span className="grid h-[22px] w-[22px] place-items-center rounded-md bg-[#F59E0B]/12 text-[#F59E0B]">
                <Star size={14} fill={note.starred ? 'currentColor' : 'none'} />
              </span>
              {note.starred ? 'Unstar' : 'Star'}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTogglePin() }}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] font-semibold text-[var(--text-primary)] transition-colors hover:bg-[#4F46E5]/[0.08]"
            >
              <span className="grid h-[22px] w-[22px] place-items-center rounded-md" style={{ background: sw.tint, color: sw.swatch }}>
                {note.pinned ? <PinOff size={14} /> : <Pin size={14} />}
              </span>
              {note.pinned ? 'Unpin' : 'Pin to top'}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit() }}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] font-semibold text-[var(--text-primary)] transition-colors hover:bg-[#4F46E5]/[0.08]"
            >
              <span className="grid h-[22px] w-[22px] place-items-center rounded-md" style={{ background: sw.tint, color: sw.swatch }}>
                <EditIcon size={14} />
              </span>
              Edit
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete() }}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] font-semibold text-[#B91C1C] transition-colors hover:bg-[#DC2626]/[0.08]"
            >
              <span className="grid h-[22px] w-[22px] place-items-center rounded-md bg-[#DC2626]/10 text-[#DC2626]">
                <TrashIcon size={14} />
              </span>
              Delete
            </button>
          </div>
        )}
      </div>
    </article>
  )
}

/* ---------- empty state ---------- */
function EmptyNotes({ accent, onCreate }: { accent: ReturnType<typeof getSwatch>; onCreate: () => void }) {
  return (
    <section className="relative z-[2] pb-16 pt-8">
      <div className="relative mx-auto grid max-w-[1100px] grid-cols-1 items-center gap-10 px-5 py-10 md:grid-cols-2 md:gap-[60px] md:px-10">
        {/* halo */}
        <div
          className="pointer-events-none absolute left-[5%] top-1/2 h-[480px] w-[480px] -translate-y-1/2 rounded-full opacity-90"
          style={{ background: accent.tint, filter: 'blur(80px)' }}
        />

        {/* layered paper stack */}
        <div className="relative z-[1] mx-auto h-[360px] w-full max-w-[360px]">
          <PaperSheet className="left-0 top-[30px] opacity-85" style={{ transform: 'rotate(-8deg)', background: 'linear-gradient(to bottom, #ffffff, #FAF6F0)', borderColor: accent.tint }}>
            <PsLine w="40%" /><PsLine w="70%" /><PsLine w="55%" />
          </PaperSheet>
          <PaperSheet className="left-[50px] top-[18px]" style={{ transform: 'rotate(-2deg)', borderColor: accent.tint }}>
            <PsLine w="40%" /><PsLine w="70%" /><PsLine w="55%" />
          </PaperSheet>
          <PaperSheet
            className="left-[100px] top-2"
            style={{
              transform: 'rotate(5deg)',
              backgroundColor: '#ffffff',
              backgroundImage:
                'repeating-linear-gradient(to bottom, transparent 0px, transparent 21px, rgba(27,19,38,0.05) 21px, rgba(27,19,38,0.05) 22px)',
            }}
          >
            <div className="absolute right-0 top-0 h-8 w-8 rounded-tr-[14px]" style={{ background: 'linear-gradient(225deg, rgba(0,0,0,0.06) 0%, rgba(0,0,0,0.06) 50%, transparent 50%)' }} />
            <div className="mb-1 text-[28px] font-bold tracking-[-0.005em] text-[var(--text-primary)]" style={{ fontFamily: "'Caveat', cursive" }}>
              Untitled
            </div>
            <PsLine w="78%" strong /><PsLine w="92%" /><PsLine w="62%" /><PsLine w="88%" /><PsLine w="40%" />
          </PaperSheet>

          <span className="note-sparkle absolute right-2.5 top-[-10px] text-[28px] font-bold" style={{ color: accent.swatch }}>✦</span>
          <span className="note-sparkle absolute bottom-5 left-[-16px] text-[22px] font-bold" style={{ color: '#818CF8', animationDelay: '1s' }}>✦</span>
          <span className="note-sparkle absolute right-[-10px] top-1/2 text-[26px] font-bold" style={{ color: '#4F46E5', animationDelay: '2s' }}>+</span>
        </div>

        <div className="relative z-[1]">
          <h2 className="m-0 mb-3.5 font-extrabold leading-[1.05] tracking-[-0.03em]" style={{ fontFamily: bricolage, fontSize: 'clamp(36px, 4vw, 52px)' }}>
            No notes yet
          </h2>
          <p className="mb-7 max-w-[420px] text-base leading-[1.55] text-[var(--text-secondary)]">
            <span className="mr-1.5 align-[-2px] text-[22px] font-bold tracking-[-0.005em]" style={{ fontFamily: "'Caveat', cursive", color: accent.swatch }}>
              Tip:
            </span>
            start with a quick thought, a meeting recap, or a wild idea — anything to fill the page.
          </p>
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center gap-2.5 rounded-full px-6 py-3.5 text-[15px] font-bold text-white transition-transform hover:-translate-y-0.5"
            style={{ background: `linear-gradient(135deg, ${accent.swatch}, #4F46E5)`, boxShadow: `0 14px 30px -10px ${accent.tint}` }}
          >
            <PlusIcon size={14} />
            Create your first note
          </button>
        </div>
      </div>
    </section>
  )
}

function PaperSheet({ className = '', style, children }: { className?: string; style?: React.CSSProperties; children?: React.ReactNode }) {
  return (
    <div
      className={`absolute flex h-[300px] w-[240px] flex-col gap-2.5 rounded-[14px] border border-[var(--border-subtle)] bg-[var(--surface)] px-[22px] pt-[22px] shadow-[0_18px_40px_-16px_rgba(27,19,38,0.18),0_4px_12px_-4px_rgba(27,19,38,0.06)] ${className}`}
      style={style}
    >
      {children}
    </div>
  )
}

function PsLine({ w, strong }: { w: string; strong?: boolean }) {
  return <div className="rounded-full" style={{ width: w, height: strong ? 8 : 6, background: strong ? 'rgba(27,19,38,0.13)' : 'rgba(27,19,38,0.07)' }} />
}
