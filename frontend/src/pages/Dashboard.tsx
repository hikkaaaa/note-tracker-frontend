import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { RotateCcw, Trash2, ChevronLeft, FileText, FolderOpen, Info } from 'lucide-react'
import { CursorField } from '../components/CursorField'
import { CreateFolderModal } from '../components/CreateFolderModal'
import type { FormState as FolderFormState } from '../components/CreateFolderModal'
import { DeleteFolderModal } from '../components/DeleteFolderModal'
import type { LocalFolder, LocalNote } from '../lib/localWorkspace'
import { fetchFolders, createFolder, updateFolder, deleteFolder } from '../lib/workspace'
import { fetchTrash, fetchTrashFolderNotes, restoreFolder, restoreNote, purgeFolderForever, purgeNoteForever } from '../lib/workspace'
import type { TrashFolderItem } from '../lib/workspace'
import { getAuthToken, getAuthUser } from '../lib/authToken'
import { getProfile } from '../lib/profile'
import { getSwatch } from '../lib/folderColors'
import { BrandLogo } from '../components/BrandLogo'

const bricolage = "'Quicksand', sans-serif"
const geist = "'Poppins', ui-sans-serif, sans-serif"

/* ---------- inline icons (match the design 1:1) ---------- */
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
const GridIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </svg>
)
const ListIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" />
    <line x1="8" y1="12" x2="21" y2="12" />
    <line x1="8" y1="18" x2="21" y2="18" />
    <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" />
    <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" />
  </svg>
)
const SparkleIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M12 2 L13.5 9 L20 10.5 L13.5 12 L12 19 L10.5 12 L4 10.5 L10.5 9 Z" />
  </svg>
)
const MoreIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="5" cy="12" r="1.4" fill="currentColor" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" />
    <circle cx="19" cy="12" r="1.4" fill="currentColor" />
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
const FolderGlyph = ({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </svg>
)
const BellIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
)

type ViewMode = 'grid' | 'list'
type Tab = 'folders' | 'all-notes' | 'trash'

// Header nav items. 'Folders' and 'All notes' switch the dashboard view; the rest are
// not wired up yet.
const NAV_LINKS: { label: string; tab?: Tab }[] = [
  { label: 'Folders', tab: 'folders' },
  { label: 'All notes', tab: 'all-notes' },
  { label: 'Shared' },
  { label: 'Trash', tab: 'trash' },
]
const FILTERS = ['All', 'Pinned', 'Recent', 'Shared', 'Archive']

// One note paired with the folder it lives in — the unit rendered in the All Notes grid.
interface NoteWithFolder {
  note: LocalNote
  folder: LocalFolder
}

export function Dashboard() {
  const navigate = useNavigate()
  const [folders, setFolders] = useState<LocalFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<Tab>('folders')
  const [view, setView] = useState<ViewMode>('grid')
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false)
  const [editingFolder, setEditingFolder] = useState<LocalFolder | null>(null)
  const [deletingFolder, setDeletingFolder] = useState<LocalFolder | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null)

  const authUser = getAuthUser()
  const avatar = getProfile().avatar

  // Gate the dashboard behind a session: no token → straight to login.
  useEffect(() => {
    if (!getAuthToken()) navigate('/login', { replace: true })
  }, [navigate])

  // Load the signed-in user's folders from the backend.
  useEffect(() => {
    if (!getAuthToken()) return
    let cancelled = false
    setLoading(true)
    fetchFolders()
      .then((data) => { if (!cancelled) { setFolders(data); setLoadError('') } })
      .catch((err) => { if (!cancelled) setLoadError(err?.message ?? 'Could not load your folders.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase()
    if (!k) return folders
    return folders.filter(
      (folder) =>
        folder.name.toLowerCase().includes(k) || folder.purpose.toLowerCase().includes(k),
    )
  }, [folders, q])

  const totalNotes = folders.reduce((sum, folder) => sum + folder.notes.length, 0)

  // Flat list of every note across all folders, each tagged with its origin folder —
  // backs the "All notes" view. fetchFolders already returns notes nested per folder,
  // so no extra request is needed.
  const allNotes = useMemo<NoteWithFolder[]>(
    () => folders.flatMap((folder) => folder.notes.map((note) => ({ note, folder }))),
    [folders],
  )

  const filteredNotes = useMemo(() => {
    const k = q.trim().toLowerCase()
    if (!k) return allNotes
    return allNotes.filter(
      ({ note, folder }) =>
        note.title.toLowerCase().includes(k) ||
        (note.purpose ?? '').toLowerCase().includes(k) ||
        folder.name.toLowerCase().includes(k),
    )
  }, [allNotes, q])

  const openCreateFolder = () => {
    setEditingFolder(null)
    setIsFolderModalOpen(true)
  }

  const handleFolderSubmit = async (form: FolderFormState) => {
    if (editingFolder) {
      const editId = editingFolder.id
      try {
        const updated = await updateFolder(editId, form)
        // Preserve the existing notes (the update response carries them too, but keep the
        // in-memory list authoritative for note counts shown on the card).
        setFolders((current) =>
          current.map((folder) =>
            folder.id === editId ? { ...updated, notes: folder.notes } : folder,
          ),
        )
      } catch (err) {
        setLoadError((err as Error)?.message ?? 'Could not update the folder.')
      }
      return
    }
    try {
      const created = await createFolder(form)
      setFolders((current) => [created, ...current])
    } catch (err) {
      setLoadError((err as Error)?.message ?? 'Could not create the folder.')
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingFolder) return
    const delId = deletingFolder.id
    try {
      await deleteFolder(delId)
      setFolders((current) => current.filter((folder) => folder.id !== delId))
    } catch (err) {
      setLoadError((err as Error)?.message ?? 'Could not delete the folder.')
    }
  }

  return (
    <div
      className="relative min-h-screen overflow-x-hidden"
      style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: geist }}
    >
      {/* background halos + grid */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
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

      <div className="relative z-[1] mx-auto max-w-[1440px] px-5 pb-16 pt-5 sm:px-10 sm:pb-20 sm:pt-7">
        <header className="relative z-[5] mb-9 grid grid-cols-[1fr_auto] items-center gap-6 md:grid-cols-[1fr_auto_1fr]">
          <a href="/" className="flex items-center gap-2 no-underline" style={{ color: 'var(--text-primary)' }}>
            <BrandLogo size={44} />
            <span className="text-[18px] font-bold leading-none tracking-[-0.01em]">
              hixie<span style={{ color: '#F99A00' }}>.</span>
            </span>
          </a>

          <nav className="hidden gap-0.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] p-1.5 shadow-[0_12px_30px_-18px_rgba(27,19,38,0.18)] md:flex">
            {NAV_LINKS.map((link) => {
              const active = link.tab != null && link.tab === tab
              return (
                <button
                  key={link.label}
                  type="button"
                  onClick={() => link.tab && setTab(link.tab)}
                  className={`rounded-full px-[18px] py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)]'
                      : 'text-[var(--text-primary)] hover:bg-[#7758A3]/[0.08]'
                  }`}
                >
                  {link.label}
                </button>
              )
            })}
          </nav>

          <div className="flex items-center gap-2.5 justify-self-end">
            <button
              type="button"
              aria-label="Notifications"
              className="relative grid h-[42px] w-[42px] place-items-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-primary)] shadow-[0_8px_22px_-16px_rgba(27,19,38,0.2)] transition-transform hover:-translate-y-px"
            >
              <BellIcon />
              <span className="absolute right-[11px] top-[9px] h-2 w-2 rounded-full bg-[#F99A00] ring-2 ring-white" />
            </button>
            <Link
              to="/profile"
              aria-label="Open your profile and settings"
              className="inline-flex items-center gap-2.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] py-[5px] pl-[5px] pr-4 text-sm font-semibold no-underline shadow-[0_8px_22px_-16px_rgba(27,19,38,0.2)] transition-transform hover:-translate-y-px"
              style={{ color: 'var(--text-primary)' }}
            >
              {avatar ? (
                <img
                  src={avatar}
                  alt=""
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <span
                  className="grid h-8 w-8 place-items-center rounded-full text-[13px] font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #FFC24B, #F99A00)', fontFamily: bricolage }}
                >
                  {(authUser?.nickname?.[0] ?? '?').toUpperCase()}
                </span>
              )}
              <span className="hidden sm:inline">{authUser?.nickname ?? 'Account'}</span>
            </Link>
          </div>
        </header>

        {tab === 'trash' ? (
          <TrashView />
        ) : (
        <>
        {/* hero header */}
        <section className="relative z-[3] mb-8 grid grid-cols-1 items-end gap-8 lg:grid-cols-[1fr_auto]">
          <div>
            <h1
              className="m-0 font-extrabold leading-[1.05] tracking-[-0.035em]"
              style={{ fontFamily: bricolage, fontSize: 'clamp(40px, 6.4vw, 84px)' }}
            >
              {tab === 'all-notes' ? 'All Notes' : 'My Folders'}
              <span
                className="inline-block bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(120deg, #FFC24B, #F99A00, #F26A1B)' }}
              >
                .
              </span>
            </h1>
            <p className="mt-[18px] text-sm tracking-[-0.005em] text-[var(--text-secondary)]">
              {tab === 'all-notes' ? (
                <>
                  <b className="font-semibold text-[var(--text-primary)]">{totalNotes}</b> note{totalNotes !== 1 ? 's' : ''} across{' '}
                  <b className="font-semibold text-[var(--text-primary)]">{folders.length}</b> folder{folders.length !== 1 ? 's' : ''}
                </>
              ) : (
                <>
                  <b className="font-semibold text-[var(--text-primary)]">{folders.length}</b> folder{folders.length !== 1 ? 's' : ''}
                  <span className="mx-3 inline-block h-1 w-1 -translate-y-px rounded-full bg-[#6E5F7B] opacity-50 align-middle" />
                  <b className="font-semibold text-[var(--text-primary)]">{totalNotes}</b> note{totalNotes !== 1 ? 's' : ''}
                </>
              )}
            </p>
          </div>

          <div className="flex flex-col gap-2.5 lg:min-w-[340px]">
            <div className="flex items-center gap-2.5 rounded-[14px] border-[1.5px] border-[var(--border-subtle)] bg-[var(--surface)] px-3.5 py-3 shadow-[0_10px_28px_-16px_rgba(27,19,38,0.18)] transition-all focus-within:border-[#8B5CF6] focus-within:ring-4 focus-within:ring-[#7758A3]/[0.12]">
              <span className="grid place-items-center text-[var(--text-secondary)]"><SearchIcon /></span>
              <input
                id="folder-search"
                type="text"
                placeholder="Search folders, tags, notes…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-secondary)]"
              />
            </div>

            <button
              type="button"
              onClick={openCreateFolder}
              className="inline-flex items-center justify-center gap-2.5 rounded-full bg-[var(--btn-primary-bg)] py-[13px] pl-2 pr-[22px] text-sm font-semibold text-[var(--btn-primary-text)] shadow-[0_14px_30px_-16px_rgba(27,19,38,0.5)] transition-transform hover:-translate-y-px"
            >
              <span className="grid h-[30px] w-[30px] place-items-center rounded-full bg-[#F59E0B] text-[#1B1326]">
                <PlusIcon size={13} />
              </span>
              New folder
            </button>
          </div>
        </section>

        {/* filter row */}
        <div className="relative z-[3] mb-7 flex flex-col items-stretch justify-between gap-3 border-b border-dashed border-[var(--border-subtle)] pb-[18px] sm:flex-row sm:items-center sm:gap-[18px]">
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((label) => {
              const on = label === 'All'
              return (
                <button
                  key={label}
                  type="button"
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[13px] font-medium transition-colors ${
                    on
                      ? 'border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-primary)] shadow-[0_6px_18px_-12px_rgba(27,19,38,0.18)]'
                      : 'border-transparent text-[var(--text-secondary)] hover:bg-[#7758A3]/[0.06] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {label === 'Pinned' && <SparkleIcon size={11} />}
                  {label}
                  {on && (
                    <span className="rounded-full bg-[#7758A3]/10 px-1.5 py-0.5 text-[11px] text-[#8B5CF6]">
                      {folders.length}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="flex gap-0.5 self-end rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface)] p-[3px] sm:self-auto">
            {(['grid', 'list'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setView(mode)}
                aria-label={mode === 'grid' ? 'Grid view' : 'List view'}
                className={`grid place-items-center rounded-[7px] px-2.5 py-[7px] transition-colors ${
                  view === mode ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {mode === 'grid' ? <GridIcon /> : <ListIcon />}
              </button>
            ))}
          </div>
        </div>

        {loadError && (
          <div className="relative z-[3] mb-5 rounded-xl border border-[#DB3E8C]/25 bg-[#DB3E8C]/[0.07] px-4 py-3 text-sm font-medium text-[#B91C57]">
            {loadError}
          </div>
        )}

        {loading && (
          <div className="relative z-[2] flex items-center justify-center gap-3 py-20 text-[var(--text-secondary)]">
            <span className="h-5 w-5 animate-spin rounded-full border-[2.5px] border-[#7758A3]/25 border-t-[#7758A3]" />
            Loading your folders…
          </div>
        )}

        {/* folder grid / list */}
        {!loading && tab === 'folders' && (
        <main
          className={
            view === 'grid'
              ? 'relative z-[2] grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              : 'relative z-[2] flex flex-col gap-2.5'
          }
        >
          {filtered.map((folder) => (
            <FolderCard
              key={folder.id}
              folder={folder}
              view={view}
              menuOpen={menuOpenId === folder.id}
              onMenuToggle={() => setMenuOpenId((id) => (id === folder.id ? null : folder.id))}
              onMenuClose={() => setMenuOpenId(null)}
              onEdit={() => {
                setEditingFolder(folder)
                setIsFolderModalOpen(true)
                setMenuOpenId(null)
              }}
              onDelete={() => {
                setDeletingFolder(folder)
                setMenuOpenId(null)
              }}
            />
          ))}
          <NewFolderTile view={view} onClick={openCreateFolder} />
        </main>
        )}

        {!loading && tab === 'folders' && filtered.length === 0 && q.trim() && (
          <div className="relative z-[2] py-[60px] text-center text-[var(--text-secondary)]">
            <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface)]">
              <FolderGlyph size={28} color="#8B5CF6" />
            </div>
            <p>
              No folders match "<b className="text-[var(--text-primary)]">{q}</b>". Try a different search.
            </p>
          </div>
        )}

        {/* All-notes grid — every note across folders, tagged with its origin color */}
        {!loading && tab === 'all-notes' && (
          filteredNotes.length === 0 ? (
            <div className="relative z-[2] py-[60px] text-center text-[var(--text-secondary)]">
              <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface)]">
                <FolderGlyph size={28} color="#8B5CF6" />
              </div>
              <p>
                {q.trim()
                  ? <>No notes match "<b className="text-[var(--text-primary)]">{q}</b>". Try a different search.</>
                  : 'No notes yet. Open a folder to create your first note.'}
              </p>
            </div>
          ) : (
            <main
              className={
                view === 'grid'
                  ? 'relative z-[2] grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                  : 'relative z-[2] flex flex-col gap-2.5'
              }
            >
              {filteredNotes.map(({ note, folder }) => (
                <AllNoteCard
                  key={note.id}
                  note={note}
                  folder={folder}
                  view={view}
                  onOpen={() => navigate(`/notes/${note.id}`)}
                />
              ))}
            </main>
          )
        )}
        </>
        )}
      </div>

      <CreateFolderModal
        isOpen={isFolderModalOpen}
        initialFolder={editingFolder}
        onClose={() => setIsFolderModalOpen(false)}
        onSubmit={handleFolderSubmit}
      />

      {deletingFolder && (
        <DeleteFolderModal
          folder={deletingFolder}
          onClose={() => setDeletingFolder(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  )
}

/* ---------- folder card ---------- */
function FolderCard({
  folder,
  view,
  menuOpen,
  onMenuToggle,
  onMenuClose,
  onEdit,
  onDelete,
}: {
  folder: LocalFolder
  view: ViewMode
  menuOpen: boolean
  onMenuToggle: () => void
  onMenuClose: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const navigate = useNavigate()
  const sw = getSwatch(folder.color)
  const noteCount = folder.notes.length
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

  const open = () => navigate(`/folders/${folder.id}`)

  const menu = (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-label={`${folder.name} options`}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onMenuToggle()
        }}
        className={`grid h-9 w-9 place-items-center rounded-xl transition-colors ${
          menuOpen ? 'bg-white/[0.22] text-white' : 'text-white/85 hover:bg-white/[0.18] hover:text-white'
        }`}
      >
        <MoreIcon size={18} />
      </button>
      {menuOpen && (
        <div
          role="menu"
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-[calc(100%+8px)] right-0 z-50 flex min-w-[156px] flex-col gap-0.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-1.5 text-[var(--text-primary)] shadow-[0_10px_24px_-8px_rgba(27,19,38,0.18),0_24px_60px_-20px_rgba(27,19,38,0.30)] animate-modal-in"
        >
          <button
            type="button"
            role="menuitem"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit() }}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] font-semibold transition-colors hover:bg-[#7758A3]/[0.08]"
          >
            <span className="grid h-[22px] w-[22px] place-items-center rounded-md bg-[#7758A3]/10 text-[#8B5CF6]">
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
  )

  if (view === 'list') {
    return (
      <article
        onClick={open}
        className="relative flex min-h-[76px] w-full cursor-pointer items-center gap-[18px] rounded-[18px] px-5 py-3.5 text-white"
        style={{ background: sw.back }}
      >
        <h3 className="m-0 truncate text-[18px] font-extrabold tracking-[-0.02em]" style={{ fontFamily: bricolage }}>
          {folder.name}
        </h3>
        <p className="m-0 hidden max-w-[380px] flex-1 truncate text-[13px] font-semibold text-white/85 sm:block">
          {folder.purpose}
        </p>
        <p className="m-0 ml-auto whitespace-nowrap text-[13px] font-bold text-white/90">
          {noteCount} {noteCount === 1 ? 'note' : 'notes'}
        </p>
        {menu}
      </article>
    )
  }

  return (
    <article
      onClick={open}
      className="folder-card-3d group relative h-[220px] w-full cursor-pointer overflow-hidden rounded-[24px] shadow-[0_1px_3px_rgba(27,19,38,0.06)]"
      style={{ ['--fhalo' as string]: sw.halo } as React.CSSProperties}
    >
      {/* 1. back gradient */}
      <div className="absolute inset-x-0 bottom-0 h-[88%] rounded-[24px]" style={{ background: sw.back }} />

      {/* 2. white note peeking out */}
      <div className="folder-note-peek absolute left-[22px] right-[22px] top-4 z-10 flex h-[86px] flex-col gap-2 rounded-t-2xl rounded-b-lg border border-white/80 bg-[var(--folder-peek-bg)] p-4 shadow-[0_20px_25px_-5px_rgba(15,23,42,0.08),0_8px_10px_-6px_rgba(15,23,42,0.05)]">
        <span className="h-[7px] w-2/3 rounded-full bg-slate-200/70" />
        <span className="h-[7px] w-full rounded-full bg-slate-200/70" />
        <span className="h-[7px] w-4/5 rounded-full bg-slate-200/70" />
      </div>

      {/* 3. front gradient with tab notch */}
      <div
        className="absolute inset-x-0 bottom-0 z-20 h-[66%] overflow-hidden rounded-b-[24px] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]"
        style={{ background: sw.front, clipPath: 'polygon(0 0, 40% 0, 55% 16%, 100% 16%, 100% 100%, 0 100%)' }}
      />

      {/* 4. content */}
      <div className="absolute inset-0 z-30 flex flex-col justify-end p-5 text-white">
        <h3 className="m-0 truncate text-[22px] font-extrabold leading-[1.1] tracking-[-0.025em]" style={{ fontFamily: bricolage }}>
          {folder.name}
        </h3>
        <p className="m-0 mt-1 truncate text-[13px] font-semibold text-white/85">{folder.purpose}</p>
        <p className="m-0 mt-3 text-[13px] font-bold text-white/90">
          {noteCount} {noteCount === 1 ? 'note' : 'notes'}
        </p>
      </div>

      {/* more menu — bottom-right */}
      <div className="absolute bottom-4 right-4 z-40">{menu}</div>
    </article>
  )
}

/* ---------- new folder tile ---------- */
function NewFolderTile({ view, onClick }: { view: ViewMode; onClick: () => void }) {
  if (view === 'list') {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3.5 rounded-[18px] border-[1.5px] border-dashed border-[#7758A3]/30 px-5 py-3.5 text-left transition-colors hover:border-[#8B5CF6]"
        style={{ background: 'rgba(255,255,255,0.5)' }}
      >
        <span className="grid h-[38px] w-[38px] place-items-center rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)]">
          <PlusIcon size={18} />
        </span>
        <span className="text-[18px] font-extrabold tracking-[-0.02em]" style={{ fontFamily: bricolage }}>
          New folder
        </span>
        <span className="text-xs text-[var(--text-secondary)]">Group notes by topic, project, or vibe</span>
      </button>
    )
  }

  return (
    <button type="button" onClick={onClick} className="group h-[220px] w-full text-left">
      <div
        className="flex h-full flex-col items-center justify-center gap-2 rounded-[24px] border-[1.5px] border-dashed border-[#7758A3]/30 p-4 text-center transition-colors group-hover:border-[#8B5CF6]"
        style={{ background: 'radial-gradient(circle at top left, rgba(119,88,163,0.06), transparent 50%), rgba(255,255,255,0.5)' }}
      >
        <span className="mb-1 grid h-12 w-12 place-items-center rounded-full bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] shadow-[0_10px_22px_-10px_rgba(27,19,38,0.5)]">
          <PlusIcon size={22} />
        </span>
        <span className="text-[20px] font-extrabold tracking-[-0.02em] text-[var(--text-primary)]" style={{ fontFamily: bricolage }}>
          New folder
        </span>
        <span className="max-w-[200px] text-xs leading-snug text-[var(--text-secondary)]">
          Group notes by topic, project, or vibe
        </span>
      </div>
    </button>
  )
}

/* ---------- all-notes card ----------
   A note shown in the global "All notes" grid. It inherits its parent folder's color
   (spine + tint wash + chip) so its origin is obvious at a glance among mixed folders. */
function AllNoteCard({
  note,
  folder,
  view,
  onOpen,
}: {
  note: LocalNote
  folder: LocalFolder
  view: ViewMode
  onOpen: () => void
}) {
  const sw = getSwatch(folder.color)

  const folderChip = (
    <span
      className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full px-2.5 py-1 text-[11px] font-bold"
      style={{ background: sw.tint, color: sw.swatch }}
    >
      <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: sw.swatch }} />
      <span className="truncate">{folder.name}</span>
    </span>
  )

  if (view === 'list') {
    return (
      <article
        onClick={onOpen}
        className="relative flex min-h-[68px] w-full cursor-pointer items-center gap-4 overflow-hidden rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface)] px-5 py-3.5 shadow-[0_1px_0_rgba(27,19,38,0.04),0_10px_24px_-14px_rgba(27,19,38,0.12)] transition-transform hover:-translate-y-px"
      >
        <span className="absolute bottom-0 left-0 top-0 w-[5px]" style={{ background: sw.swatch }} />
        <h3 className="m-0 ml-1 max-w-[45%] truncate text-[17px] font-extrabold tracking-[-0.02em]" style={{ fontFamily: bricolage }}>
          {note.title || 'Untitled'}
        </h3>
        <p className="m-0 hidden min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--text-secondary)] sm:block">{note.purpose || '—'}</p>
        <span className="ml-auto flex-shrink-0">{folderChip}</span>
      </article>
    )
  }

  return (
    <article
      onClick={onOpen}
      className="group relative flex h-[180px] cursor-pointer flex-col overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface)] shadow-[0_1px_0_rgba(27,19,38,0.04),0_10px_24px_-14px_rgba(27,19,38,0.10)] transition-transform hover:-translate-y-1"
    >
      {/* color spine + soft tint wash, both from the parent folder */}
      <span className="absolute bottom-0 left-0 top-0 z-[1] w-[5px]" style={{ background: sw.swatch }} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16" style={{ background: `linear-gradient(to bottom, ${sw.tint}, transparent)` }} />

      <div className="relative z-[1] flex flex-1 flex-col p-5 pl-[22px]">
        <span className="self-start">{folderChip}</span>
        <h3 className="m-0 mt-3 truncate text-[19px] font-extrabold leading-[1.15] tracking-[-0.025em]" style={{ fontFamily: bricolage }}>
          {note.title || 'Untitled'}
        </h3>
        <p className="m-0 mt-auto truncate pt-3 text-[13px] font-medium text-[var(--text-secondary)]">{note.purpose || '—'}</p>
      </div>
    </article>
  )
}

/* ---------- trash ----------
   Hierarchical: the grid shows only folders that hold trashed content. Opening a card
   reveals either all of a trashed folder's notes (whole folder deleted) or just the
   soft-deleted notes inside a still-live folder. Restore brings items back; "Delete
   forever" hard-deletes now (the backend also auto-purges anything past 7 days). */
function TrashView() {
  const [items, setItems] = useState<TrashFolderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<TrashFolderItem | null>(null)
  const [notes, setNotes] = useState<LocalNote[]>([])
  const [notesLoading, setNotesLoading] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setItems(await fetchTrash()); setError('') }
    catch (err) { setError((err as Error)?.message ?? 'Could not load Trash.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const openCard = async (it: TrashFolderItem) => {
    setSelected(it)
    setNotesLoading(true)
    try { setNotes(await fetchTrashFolderNotes(it.id)) }
    catch { setNotes([]) }
    finally { setNotesLoading(false) }
  }

  const back = () => { setSelected(null); load() }

  const banner = (
    <div className="relative z-[2] mb-7 flex items-start gap-3 rounded-2xl border border-[#F59E0B]/30 bg-[#F59E0B]/[0.08] px-4 py-3.5">
      <span className="mt-0.5 grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-[#F59E0B]/15 text-[#B45309]"><Info className="h-4 w-4" /></span>
      <p className="m-0 text-[13.5px] leading-snug text-[var(--text-primary)]">
        Items in Trash are retained for <b className="font-bold">7 days</b> before being completely purged from the system. This action frees up disk space automatically.
      </p>
    </div>
  )

  const heading = (title: string, sub: string) => (
    <div className="relative z-[3] mb-6">
      <h1 className="m-0 font-extrabold leading-[1.05] tracking-[-0.035em]" style={{ fontFamily: bricolage, fontSize: 'clamp(36px, 5vw, 64px)' }}>
        {title}<span className="text-[#F99A00]">.</span>
      </h1>
      <p className="mt-3 text-sm text-[var(--text-secondary)]">{sub}</p>
    </div>
  )

  // ---- detail: a single trash card's notes ----
  if (selected) {
    const sw = getSwatch(selected.color)
    const doRestoreFolder = async () => { setBusy(true); try { await restoreFolder(selected.id) } finally { setBusy(false); back() } }
    const doPurgeFolder = async () => {
      if (!window.confirm(`Permanently delete "${selected.name}" and everything in it? This cannot be undone.`)) return
      setBusy(true); try { await purgeFolderForever(selected.id) } finally { setBusy(false); back() }
    }
    const afterNoteChange = (id: number) => {
      const remaining = notes.filter((n) => n.id !== id)
      setNotes(remaining)
      if (remaining.length === 0) back()
    }
    const doRestoreNote = async (id: number) => { setBusy(true); try { await restoreNote(id); afterNoteChange(id) } finally { setBusy(false) } }
    const doPurgeNote = async (id: number) => {
      if (!window.confirm('Permanently delete this note? This cannot be undone.')) return
      setBusy(true); try { await purgeNoteForever(id); afterNoteChange(id) } finally { setBusy(false) }
    }

    return (
      <div>
        {banner}
        <div className="relative z-[3] mb-6 flex flex-wrap items-center gap-3">
          <button onClick={back} className="grid h-[42px] w-[42px] place-items-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-primary)] transition-transform hover:-translate-x-px">
            <ChevronLeft className="h-[18px] w-[18px]" />
          </button>
          <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 font-bold tracking-[-0.005em]" style={{ background: sw.tint, color: sw.swatch }}>
            <span className="h-2 w-2 rounded-full" style={{ background: sw.swatch }} />
            {selected.name}
          </span>
          <span className="text-[13px] text-[var(--text-secondary)]">
            {selected.folderDeleted ? 'Whole folder in Trash' : 'Deleted notes'}
          </span>
          {selected.folderDeleted && (
            <div className="ml-auto flex gap-2">
              <button onClick={doRestoreFolder} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3.5 py-2 text-[13px] font-semibold text-[var(--text-primary)] transition-colors hover:bg-[#7758A3]/[0.06] disabled:opacity-50">
                <RotateCcw className="h-4 w-4" /> Restore folder
              </button>
              <button onClick={doPurgeFolder} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl bg-[#DC2626]/10 px-3.5 py-2 text-[13px] font-semibold text-[var(--danger-text)] transition-colors hover:bg-[#DC2626]/15 disabled:opacity-50">
                <Trash2 className="h-4 w-4" /> Delete forever
              </button>
            </div>
          )}
        </div>

        {notesLoading ? (
          <div className="py-16 text-center text-[var(--text-secondary)]">Loading…</div>
        ) : notes.length === 0 ? (
          <div className="py-16 text-center text-[var(--text-secondary)]">No notes here.</div>
        ) : (
          <main className="relative z-[2] flex flex-col gap-2.5">
            {notes.map((n) => (
              <article key={n.id} className="flex items-center gap-4 overflow-hidden rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface)] px-5 py-3.5">
                <span className="h-9 w-9 flex-shrink-0 grid place-items-center rounded-xl" style={{ background: sw.tint, color: sw.swatch }}><FileText className="h-[18px] w-[18px]" /></span>
                <div className="min-w-0 flex-1">
                  <h3 className="m-0 truncate text-[16px] font-extrabold tracking-[-0.015em]" style={{ fontFamily: bricolage }}>{n.title || 'Untitled'}</h3>
                  <p className="m-0 truncate text-[12.5px] text-[var(--text-secondary)]">{n.purpose || '—'}</p>
                </div>
                {selected.folderDeleted ? (
                  <span className="text-[12px] italic text-[var(--text-secondary)]">restores with folder</span>
                ) : (
                  <div className="flex flex-shrink-0 gap-2">
                    <button onClick={() => doRestoreNote(n.id)} disabled={busy} title="Restore" className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--border-subtle)] text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-50"><RotateCcw className="h-[16px] w-[16px]" /></button>
                    <button onClick={() => doPurgeNote(n.id)} disabled={busy} title="Delete forever" className="grid h-9 w-9 place-items-center rounded-xl bg-[#DC2626]/10 text-[var(--danger-text)] transition-colors hover:bg-[#DC2626]/15 disabled:opacity-50"><Trash2 className="h-[16px] w-[16px]" /></button>
                  </div>
                )}
              </article>
            ))}
          </main>
        )}
      </div>
    )
  }

  // ---- grid: folders holding trashed content ----
  return (
    <div>
      {heading('Trash', 'Deleted folders and notes, grouped by their folder.')}
      {banner}
      {error && (
        <div className="relative z-[3] mb-5 rounded-xl border border-[#DB3E8C]/25 bg-[#DB3E8C]/[0.07] px-4 py-3 text-sm font-medium text-[#B91C57]">{error}</div>
      )}
      {loading ? (
        <div className="relative z-[2] flex items-center justify-center gap-3 py-20 text-[var(--text-secondary)]">
          <span className="h-5 w-5 animate-spin rounded-full border-[2.5px] border-[#7758A3]/25 border-t-[#7758A3]" /> Loading Trash…
        </div>
      ) : items.length === 0 ? (
        <div className="relative z-[2] py-[60px] text-center text-[var(--text-secondary)]">
          <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface)]"><Trash2 className="h-7 w-7 text-[#8B5CF6]" /></div>
          <p>Trash is empty. Deleted folders and notes will show up here.</p>
        </div>
      ) : (
        <main className="relative z-[2] grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((it) => {
            const sw = getSwatch(it.color)
            return (
              <button
                key={it.id}
                onClick={() => openCard(it)}
                className="group relative flex h-[150px] flex-col overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface)] p-5 text-left shadow-[0_10px_24px_-16px_rgba(27,19,38,0.18)] transition-transform hover:-translate-y-1"
              >
                <span className="absolute bottom-0 left-0 top-0 w-[5px]" style={{ background: sw.swatch }} />
                <div className="pointer-events-none absolute inset-x-0 top-0 h-14" style={{ background: `linear-gradient(to bottom, ${sw.tint}, transparent)` }} />
                <div className="relative z-[1] flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: sw.tint, color: sw.swatch }}><FolderOpen className="h-[18px] w-[18px]" /></span>
                  <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: it.folderDeleted ? 'rgba(220,38,38,0.1)' : sw.tint, color: it.folderDeleted ? 'var(--danger-text)' : sw.swatch }}>
                    {it.folderDeleted ? 'Folder deleted' : 'Notes deleted'}
                  </span>
                </div>
                <h3 className="relative z-[1] m-0 mt-3 truncate text-[19px] font-extrabold leading-[1.15] tracking-[-0.02em]" style={{ fontFamily: bricolage }}>{it.name}</h3>
                <p className="relative z-[1] m-0 mt-auto text-[13px] font-semibold text-[var(--text-secondary)]">
                  {it.trashedCount} {it.trashedCount === 1 ? 'item' : 'items'} in trash
                </p>
              </button>
            )
          })}
        </main>
      )}
    </div>
  )
}
