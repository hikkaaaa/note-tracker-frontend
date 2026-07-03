import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { RotateCcw, Trash2, ChevronLeft, FileText, FolderOpen, Info, Pin, PinOff, Archive, ArchiveRestore, Users, Share2, Check, X } from 'lucide-react'
import { CreateFolderModal } from '../components/CreateFolderModal'
import type { FormState as FolderFormState } from '../components/CreateFolderModal'
import { DeleteFolderModal } from '../components/DeleteFolderModal'
import { ShareModal } from '../components/ShareModal'
import type { LocalFolder, LocalNote } from '../lib/localWorkspace'
import { fetchFolders, createFolder, updateFolder, deleteFolder } from '../lib/workspace'
import { fetchTrash, fetchTrashFolderNotes, restoreFolder, restoreNote, purgeFolderForever, purgeNoteForever } from '../lib/workspace'
import { fetchSharedFolders, fetchNotifications, respondToShare } from '../lib/workspace'
import type { TrashFolderItem, SharedFolder, ShareNotification } from '../lib/workspace'
import { getAuthToken, getAuthUser } from '../lib/authToken'
import { useProfile } from '../lib/profileContext'
import { getSwatch } from '../lib/folderColors'
import { BrandLogo } from '../components/BrandLogo'
import { CardActionMenu } from '../components/CardActionMenu'

const bricolage = "'Quicksand', sans-serif"
const geist = "'Poppins', ui-sans-serif, sans-serif"

/* Blend a hex color toward another (t = amount of `toward`, 0..1). Used to mute the
   vibrant folder swatches into soft pastels — easy on the eyes but still color-coded. */
function mixHex(hex: string, toward: string, t: number): string {
  const parse = (h: string) => {
    const n = parseInt(h.replace('#', ''), 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  const a = parse(hex)
  const b = parse(toward)
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t))
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`
}

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
  { label: 'Trash', tab: 'trash' },
]
const FILTERS = ['All', 'Pinned', 'Recent', 'Shared', 'Archive'] as const
type Filter = (typeof FILTERS)[number]

// "Recent" = worked with in the last 14 days (folder or any of its notes edited).
const RECENT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000

// The backend sends naive UTC timestamps (no zone suffix). Tag them as UTC before parsing,
// otherwise the browser reads them as local time and the recency math is off by the user's
// timezone offset.
function parseServerDate(iso: string): number {
  if (!iso) return NaN
  const hasZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso)
  return new Date(hasZone ? iso : `${iso}Z`).getTime()
}

function isRecent(iso: string, now: number): boolean {
  if (!iso) return false
  const t = parseServerDate(iso)
  return !Number.isNaN(t) && now - t <= RECENT_WINDOW_MS
}

// Does a folder belong under the given filter tab? Archived folders only ever appear under
// "Archive"; everything else is scoped to live (non-archived) folders.
function matchesFilter(folder: LocalFolder, filter: Filter, now: number): boolean {
  switch (filter) {
    case 'Pinned': return folder.pinned && !folder.archived
    case 'Recent': return !folder.archived && isRecent(folder.lastActivity, now)
    case 'Shared': return false // no sharing backend yet — tab shows a "coming soon" state
    case 'Archive': return folder.archived
    case 'All':
    default: return !folder.archived
  }
}

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
  const [filter, setFilter] = useState<Filter>('All')
  const [view, setView] = useState<ViewMode>('grid')
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false)
  const [editingFolder, setEditingFolder] = useState<LocalFolder | null>(null)
  const [deletingFolder, setDeletingFolder] = useState<LocalFolder | null>(null)
  const [sharingFolder, setSharingFolder] = useState<LocalFolder | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null)

  // Sharing: folders shared with me (accepted) back the "Shared" filter; pending shares
  // drive the notification bell.
  const [sharedFolders, setSharedFolders] = useState<SharedFolder[]>([])
  const [sharedLoading, setSharedLoading] = useState(false)
  const [notifications, setNotifications] = useState<ShareNotification[]>([])
  const [notifOpen, setNotifOpen] = useState(false)

  const authUser = getAuthUser()
  // Shared profile: the header avatar updates live when /profile saves a change.
  const { profile } = useProfile()
  const avatar = profile?.avatar ?? ''
  const viewSeeded = useRef(false)

  // Gate the dashboard behind a session: no token → straight to login.
  useEffect(() => {
    if (!getAuthToken()) navigate('/login', { replace: true })
  }, [navigate])

  // Seed the grid/list toggle from the saved default view — once, so a later manual
  // toggle isn't clobbered when the profile re-loads.
  useEffect(() => {
    if (!viewSeeded.current && profile) {
      setView(profile.defaultView)
      viewSeeded.current = true
    }
  }, [profile])

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

  // Folders shared with me — loaded once on mount so the "Shared" filter badge is accurate,
  // and re-loadable after accepting a notification.
  const loadShared = useCallback(async () => {
    setSharedLoading(true)
    try { setSharedFolders(await fetchSharedFolders()) }
    catch { /* non-fatal: the Shared tab just shows empty */ }
    finally { setSharedLoading(false) }
  }, [])

  // Pending share notifications — polled so the bell reflects new incoming shares without a
  // manual refresh.
  const loadNotifications = useCallback(async () => {
    try { setNotifications(await fetchNotifications()) }
    catch { /* keep the last known list */ }
  }, [])

  useEffect(() => {
    if (!getAuthToken()) return
    loadShared()
    loadNotifications()
    const id = setInterval(loadNotifications, 30_000)
    return () => clearInterval(id)
  }, [loadShared, loadNotifications])

  // Accept/decline a pending share, then refresh: accepting reveals the folder under "Shared".
  const handleRespond = async (id: number, action: 'ACCEPT' | 'DECLINE') => {
    setNotifications((cur) => cur.filter((n) => n.id !== id))
    try {
      await respondToShare(id, action)
      if (action === 'ACCEPT') await loadShared()
    } catch {
      loadNotifications() // put it back if the write failed
    }
  }

  // Folder counts per filter tab (search-independent) for the pill badges.
  const filterCounts = useMemo(() => {
    const now = Date.now()
    const counts = Object.fromEntries(
      FILTERS.map((f) => [f, folders.filter((folder) => matchesFilter(folder, f, now)).length]),
    ) as Record<Filter, number>
    // "Shared" isn't part of the owned-folders list — it's the accepted-shares count.
    counts.Shared = sharedFolders.length
    return counts
  }, [folders, sharedFolders])

  const filtered = useMemo(() => {
    const now = Date.now()
    const byFilter = folders.filter((folder) => matchesFilter(folder, filter, now))
    const k = q.trim().toLowerCase()
    if (!k) return byFilter
    return byFilter.filter(
      (folder) =>
        folder.name.toLowerCase().includes(k) || folder.purpose.toLowerCase().includes(k),
    )
  }, [folders, q, filter])

  // Shared folders under the current search query (same name/purpose match as owned folders).
  const filteredShared = useMemo(() => {
    const k = q.trim().toLowerCase()
    if (!k) return sharedFolders
    return sharedFolders.filter(
      (f) => f.name.toLowerCase().includes(k) || f.purpose.toLowerCase().includes(k) || (f.sharedBy ?? '').toLowerCase().includes(k),
    )
  }, [sharedFolders, q])

  // "All notes" view ignores archived folders so archived content doesn't leak back in.
  const liveFolders = useMemo(() => folders.filter((f) => !f.archived), [folders])
  const totalNotes = liveFolders.reduce((sum, folder) => sum + folder.notes.length, 0)

  // Flat list of every note across all folders, each tagged with its origin folder —
  // backs the "All notes" view. fetchFolders already returns notes nested per folder,
  // so no extra request is needed.
  const allNotes = useMemo<NoteWithFolder[]>(
    () => liveFolders.flatMap((folder) => folder.notes.map((note) => ({ note, folder }))),
    [liveFolders],
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

  // Optimistically toggle a folder flag, rolling back if the backend write fails.
  const patchFolderFlag = async (folder: LocalFolder, patch: { pinned?: boolean; archived?: boolean }) => {
    setMenuOpenId(null)
    setFolders((current) => current.map((f) => (f.id === folder.id ? { ...f, ...patch } : f)))
    try {
      await updateFolder(folder.id, patch)
    } catch (err) {
      setFolders((current) => current.map((f) => (f.id === folder.id ? folder : f)))
      setLoadError((err as Error)?.message ?? 'Could not update the folder.')
    }
  }
  const handleTogglePin = (folder: LocalFolder) => patchFolderFlag(folder, { pinned: !folder.pinned })
  const handleToggleArchive = (folder: LocalFolder) => patchFolderFlag(folder, { archived: !folder.archived })

  return (
    <div
      className="relative min-h-screen overflow-x-hidden"
      style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: geist }}
    >
      {/* background halos + grid */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute rounded-full" style={{ width: 600, height: 600, top: -120, left: -160, background: 'rgba(99,102,241,0.08)', filter: 'blur(90px)' }} />
        <div className="absolute rounded-full" style={{ width: 720, height: 720, top: '25%', right: -240, background: 'rgba(79,70,229,0.10)', filter: 'blur(90px)' }} />
        <div className="absolute rounded-full" style={{ width: 500, height: 500, bottom: -180, left: '30%', background: 'rgba(129,140,248,0.07)', filter: 'blur(90px)' }} />
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

      <div className="relative z-[1] mx-auto max-w-[1440px] px-5 pb-16 pt-5 sm:px-10 sm:pb-20 sm:pt-7">
        <header className="relative z-[5] mb-9 grid grid-cols-[1fr_auto] items-center gap-6 md:grid-cols-[1fr_auto_1fr]">
          <a href="/" className="flex items-center gap-2 no-underline" style={{ color: 'var(--text-primary)' }}>
            <BrandLogo size={44} />
            <span className="text-[18px] font-bold leading-none tracking-[-0.01em]">
              hixie<span style={{ color: '#F97316' }}>.</span>
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
                      : 'text-[var(--text-primary)] hover:bg-[#4F46E5]/[0.08]'
                  }`}
                >
                  {link.label}
                </button>
              )
            })}
          </nav>

          <div className="flex items-center gap-2.5 justify-self-end">
            <NotificationBell
              notifications={notifications}
              open={notifOpen}
              onToggle={() => setNotifOpen((v) => !v)}
              onClose={() => setNotifOpen(false)}
              onRespond={handleRespond}
            />
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
                  style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)', fontFamily: bricolage }}
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
        {/* action bar — the big "My Folders" title is gone; the search + create controls
            now live in this space and stretch the full width of the page */}
        <section className="relative z-[3] mb-8">
          <p className="mb-3.5 text-sm tracking-[-0.005em] text-[var(--text-secondary)]">
            {tab === 'all-notes' ? (
              <>
                <b className="font-semibold text-[var(--text-primary)]">{totalNotes}</b> note{totalNotes !== 1 ? 's' : ''} across{' '}
                <b className="font-semibold text-[var(--text-primary)]">{liveFolders.length}</b> folder{liveFolders.length !== 1 ? 's' : ''}
              </>
            ) : (
              <>
                <b className="font-semibold text-[var(--text-primary)]">{liveFolders.length}</b> folder{liveFolders.length !== 1 ? 's' : ''}
                <span className="mx-3 inline-block h-1 w-1 -translate-y-px rounded-full bg-[#6E5F7B] opacity-50 align-middle" />
                <b className="font-semibold text-[var(--text-primary)]">{totalNotes}</b> note{totalNotes !== 1 ? 's' : ''}
              </>
            )}
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-center gap-2.5 rounded-[16px] border-[1.5px] border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3.5 shadow-[0_10px_28px_-16px_rgba(27,19,38,0.18)] transition-all focus-within:border-[#4F46E5] focus-within:ring-4 focus-within:ring-[#4F46E5]/[0.12]">
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
              className="inline-flex shrink-0 items-center justify-center gap-2.5 rounded-full bg-[var(--btn-primary-bg)] py-[14px] pl-2.5 pr-8 text-sm font-semibold text-[var(--btn-primary-text)] shadow-[0_14px_30px_-16px_rgba(27,19,38,0.5)] transition-transform hover:-translate-y-px"
            >
              <span className="grid h-[30px] w-[30px] place-items-center rounded-full bg-white/20 text-white">
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
              const on = label === filter
              const count = filterCounts[label]
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
                  {label === 'Pinned' && <SparkleIcon size={11} />}
                  {label === 'Recent' && <RotateCcw size={12} />}
                  {label === 'Shared' && <Users size={12} />}
                  {label === 'Archive' && <Archive size={12} />}
                  {label}
                  {on && label !== 'Shared' && (
                    <span className="rounded-full bg-[#4F46E5]/10 px-1.5 py-0.5 text-[11px] text-[#4F46E5]">
                      {count}
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
            <span className="h-5 w-5 animate-spin rounded-full border-[2.5px] border-[#4F46E5]/25 border-t-[#4F46E5]" />
            Loading your folders…
          </div>
        )}

        {/* owned folder grid / list — every filter except Shared */}
        {!loading && tab === 'folders' && filter !== 'Shared' && filtered.length > 0 && (
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
              onShare={() => {
                setSharingFolder(folder)
                setMenuOpenId(null)
              }}
              onTogglePin={() => handleTogglePin(folder)}
              onToggleArchive={() => handleToggleArchive(folder)}
            />
          ))}
        </main>
        )}

        {!loading && tab === 'folders' && filter !== 'Shared' && filtered.length === 0 && (
          <FoldersEmpty filter={filter} query={q} onCreate={openCreateFolder} />
        )}

        {/* Shared filter — folders others shared with me (read-only) */}
        {!loading && tab === 'folders' && filter === 'Shared' && (
          sharedLoading ? (
            <div className="relative z-[2] flex items-center justify-center gap-3 py-20 text-[var(--text-secondary)]">
              <span className="h-5 w-5 animate-spin rounded-full border-[2.5px] border-[#4F46E5]/25 border-t-[#4F46E5]" />
              Loading shared folders…
            </div>
          ) : filteredShared.length > 0 ? (
            <main
              className={
                view === 'grid'
                  ? 'relative z-[2] grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                  : 'relative z-[2] flex flex-col gap-2.5'
              }
            >
              {filteredShared.map((folder) => (
                <FolderCard key={folder.id} folder={folder} view={view} sharedBy={folder.sharedBy} />
              ))}
            </main>
          ) : (
            <FoldersEmpty filter="Shared" query={q} onCreate={openCreateFolder} />
          )
        )}

        {/* All-notes grid — every note across folders, tagged with its origin color */}
        {!loading && tab === 'all-notes' && (
          filteredNotes.length === 0 ? (
            <div className="relative z-[2] py-[60px] text-center text-[var(--text-secondary)]">
              <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface)]">
                <FolderGlyph size={28} color="#4F46E5" />
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

      {sharingFolder && (
        <ShareModal
          folder={sharingFolder}
          onClose={() => setSharingFolder(null)}
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
  onShare,
  onTogglePin,
  onToggleArchive,
  sharedBy,
}: {
  folder: LocalFolder
  view: ViewMode
  menuOpen?: boolean
  onMenuToggle?: () => void
  onMenuClose?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onShare?: () => void
  onTogglePin?: () => void
  onToggleArchive?: () => void
  // When set, this is a folder shared *with* me: read-only, no mutation menu, badged with
  // who shared it.
  sharedBy?: string
}) {
  const navigate = useNavigate()
  const sw = getSwatch(folder.color)
  const noteCount = folder.notes.length

  const open = () => navigate(`/folders/${folder.id}`)

  // A read-only "Shared by X" pill stands in for the ••• menu on shared folders.
  const sharedBadge = sharedBy ? (
    <span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: sw.tint, color: sw.swatch }}>
      <Users size={11} />
      <span className="truncate">Shared by {sharedBy}</span>
    </span>
  ) : null

  const menu = sharedBy ? null : (
    <CardActionMenu
      ariaLabel={`${folder.name} options`}
      open={Boolean(menuOpen)}
      onToggle={onMenuToggle ?? (() => {})}
      onClose={onMenuClose ?? (() => {})}
      triggerClass={`grid h-9 w-9 place-items-center rounded-xl transition-colors ${
        menuOpen
          ? 'bg-[var(--accent-tint)] text-[var(--text-primary)]'
          : 'text-[var(--text-secondary)] hover:bg-[var(--accent-tint)] hover:text-[var(--text-primary)]'
      }`}
      items={[
        {
          key: 'pin',
          label: folder.pinned ? 'Unpin' : 'Pin to top',
          icon: folder.pinned ? <PinOff size={14} /> : <Pin size={14} />,
          chipClass: 'bg-[#4F46E5]/10 text-[#4F46E5]',
          onSelect: onTogglePin ?? (() => {}),
        },
        {
          key: 'archive',
          label: folder.archived ? 'Unarchive' : 'Archive',
          icon: folder.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />,
          chipClass: 'bg-[#0EA5E9]/10 text-[#0EA5E9]',
          onSelect: onToggleArchive ?? (() => {}),
        },
        {
          key: 'share',
          label: 'Share',
          icon: <Share2 size={14} />,
          chipClass: 'bg-[#0EA5E9]/10 text-[#0EA5E9]',
          onSelect: onShare ?? (() => {}),
        },
        {
          key: 'edit',
          label: 'Edit',
          icon: <EditIcon size={14} />,
          chipClass: 'bg-[#4F46E5]/10 text-[#4F46E5]',
          onSelect: onEdit ?? (() => {}),
        },
        {
          key: 'delete',
          label: 'Delete',
          icon: <TrashIcon size={14} />,
          chipClass: 'bg-[#DC2626]/10 text-[#DC2626]',
          danger: true,
          onSelect: onDelete ?? (() => {}),
        },
      ]}
    >
      <MoreIcon size={18} />
    </CardActionMenu>
  )

  if (view === 'list') {
    return (
      <article
        onClick={open}
        className="relative flex min-h-[72px] w-full cursor-pointer items-center gap-4 overflow-hidden rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface)] px-5 py-3.5 shadow-[0_1px_0_rgba(27,28,40,0.04),0_10px_24px_-14px_rgba(27,28,40,0.12)] transition-transform hover:-translate-y-px"
      >
        {/* folder-color spine + glyph chip — a calm accent, not a full color wash */}
        <span className="absolute bottom-0 left-0 top-0 w-[5px]" style={{ background: sw.swatch }} />
        <span className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl" style={{ background: sw.tint }}>
          <FolderGlyph size={20} color={sw.glyph} />
        </span>
        <h3 className="m-0 truncate text-[18px] font-extrabold tracking-[-0.02em] text-[var(--text-primary)]" style={{ fontFamily: bricolage }}>
          {folder.name}
        </h3>
        <p className="m-0 hidden max-w-[380px] flex-1 truncate text-[13px] font-medium text-[var(--text-secondary)] sm:block">
          {folder.purpose}
        </p>
        <p className="m-0 ml-auto whitespace-nowrap text-[13px] font-bold" style={{ color: sw.glyph }}>
          {noteCount} {noteCount === 1 ? 'note' : 'notes'}
        </p>
        {menu || sharedBadge}
      </article>
    )
  }

  // Muted pastels: the vibrant swatch blended toward white so the folder reads as a soft,
  // easy-on-the-eye version of its color instead of a flamboyant fully-saturated block. The
  // front flap sits a touch deeper than the back for a subtle paper-in-folder gradient.
  const flapBack = `linear-gradient(180deg, ${mixHex(sw.swatch, '#FFFFFF', 0.74)}, ${mixHex(sw.swatch, '#FFFFFF', 0.56)})`
  const flapFront = `linear-gradient(180deg, ${mixHex(sw.swatch, '#FFFFFF', 0.52)}, ${mixHex(sw.swatch, '#FFFFFF', 0.34)})`
  // Left-tabbed folder silhouette for the front flap: a raised tab on the left steps down
  // to the lower body, leaving the "paper" peeking out along the top-right.
  const tabClip = 'polygon(0 24%, 38% 24%, 46% 44%, 100% 44%, 100% 100%, 0 100%)'

  return (
    <article
      onClick={open}
      className="folder-card-3d group relative h-[210px] w-full cursor-pointer overflow-hidden rounded-[20px] shadow-[0_1px_3px_rgba(27,28,40,0.06)]"
      style={{ ['--fhalo' as string]: sw.halo } as React.CSSProperties}
    >
      {/* back flap — the whole folder body behind the paper */}
      <div className="absolute inset-0 rounded-[20px]" style={{ background: flapBack }} />

      {/* white "paper" peeking out of the top, with a few faint text lines */}
      <div className="folder-note-peek absolute left-4 right-4 top-4 h-[104px] overflow-hidden rounded-[10px] bg-[var(--folder-peek-bg)] shadow-[0_2px_10px_-5px_rgba(27,19,38,0.28)]">
        <div className="flex flex-col gap-2 p-3.5">
          <span className="h-[7px] w-[64%] rounded-full" style={{ background: sw.tint }} />
          <span className="h-[7px] w-[82%] rounded-full" style={{ background: sw.tint }} />
          <span className="h-[7px] w-[46%] rounded-full" style={{ background: sw.tint }} />
        </div>
      </div>

      {/* front flap — the tabbed folder face, drawn over the paper */}
      <div className="absolute inset-0" style={{ background: flapFront, clipPath: tabClip }} />

      {/* pinned / archived corner badges */}
      {(folder.pinned || folder.archived) && (
        <div className="absolute right-3.5 top-3.5 z-[4] flex items-center gap-1.5">
          {folder.archived && (
            <span className="grid h-[26px] w-[26px] place-items-center rounded-full bg-[#0EA5E9]/12 text-[#0EA5E9]" title="Archived">
              <Archive size={13} />
            </span>
          )}
          {folder.pinned && (
            <span className="grid h-[26px] w-[26px] place-items-center rounded-full text-white shadow-[0_6px_16px_-6px_rgba(79,70,229,0.6)]" style={{ background: sw.swatch }} title="Pinned">
              <Pin size={13} fill="currentColor" />
            </span>
          )}
        </div>
      )}

      {/* folder label — deep ink of the same hue so it stays legible on the pastel face */}
      <div className="absolute inset-x-0 bottom-0 z-[3] p-5 pr-14" style={{ color: sw.glyph }}>
        <h3 className="m-0 truncate text-[20px] font-extrabold leading-[1.15] tracking-[-0.025em]" style={{ fontFamily: bricolage }}>
          {folder.name}
        </h3>
        {folder.purpose && (
          <p className="m-0 mt-0.5 truncate text-[13px] font-medium" style={{ opacity: 0.72 }}>{folder.purpose}</p>
        )}
        <p className="m-0 mt-2 text-[12.5px] font-bold" style={{ opacity: 0.9 }}>
          {noteCount} {noteCount === 1 ? 'note' : 'notes'}
        </p>
        {sharedBadge && <div className="mt-2">{sharedBadge}</div>}
      </div>

      {/* more menu — bottom-right (owned folders only) */}
      {menu && <div className="absolute bottom-4 right-4 z-[4]">{menu}</div>}
    </article>
  )
}

/* ---------- empty states for the folder filters ----------
   Each filter tab gets its own message; only the "no folders at all" case offers a
   create shortcut (every other case already has folders, just none under this filter). */
function FoldersEmpty({ filter, query, onCreate }: { filter: Filter; query: string; onCreate: () => void }) {
  const searching = Boolean(query.trim())

  let Icon: React.ElementType = FolderGlyph
  let title = 'No folders yet'
  let body: React.ReactNode = 'Create your first folder to start organizing your notes.'
  let showCreate = false

  if (searching && (filter === 'All' || filter === 'Recent' || filter === 'Pinned' || filter === 'Archive')) {
    title = 'No matches'
    body = <>No folders match "<b className="text-[var(--text-primary)]">{query}</b>". Try a different search.</>
  } else if (filter === 'Shared') {
    Icon = Users
    title = searching ? 'No matches' : 'Nothing shared with you yet'
    body = searching
      ? <>No shared folders match "<b className="text-[var(--text-primary)]">{query}</b>".</>
      : 'When someone shares a folder or notes with you and you accept, they’ll show up here.'
  } else if (filter === 'Pinned') {
    Icon = Pin
    title = 'No pinned folders'
    body = 'Pin a folder from its ••• menu to keep it at your fingertips.'
  } else if (filter === 'Recent') {
    Icon = RotateCcw
    title = 'Nothing recent'
    body = 'Folders you’ve worked in over the last 14 days will appear here.'
  } else if (filter === 'Archive') {
    Icon = Archive
    title = 'Archive is empty'
    body = 'Archive a folder from its ••• menu to tuck it away without deleting it.'
  } else {
    showCreate = true
  }

  return (
    <div className="relative z-[2] py-[60px] text-center text-[var(--text-secondary)]">
      <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface)]">
        <Icon size={28} color="#4F46E5" />
      </div>
      <p className="text-[17px] font-extrabold tracking-[-0.02em] text-[var(--text-primary)]" style={{ fontFamily: bricolage }}>{title}</p>
      <p className="mx-auto mt-1 max-w-[420px]">{body}</p>
      {showCreate && (
        <button
          type="button"
          onClick={onCreate}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--btn-primary-bg)] px-5 py-3 text-sm font-semibold text-[var(--btn-primary-text)] shadow-[0_14px_30px_-16px_rgba(27,19,38,0.5)] transition-transform hover:-translate-y-px"
        >
          <PlusIcon size={14} /> New folder
        </button>
      )}
    </div>
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
        {title}<span className="text-[#4F46E5]">.</span>
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
              <button onClick={doRestoreFolder} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-3.5 py-2 text-[13px] font-semibold text-[var(--text-primary)] transition-colors hover:bg-[#4F46E5]/[0.06] disabled:opacity-50">
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
          <span className="h-5 w-5 animate-spin rounded-full border-[2.5px] border-[#4F46E5]/25 border-t-[#4F46E5]" /> Loading Trash…
        </div>
      ) : items.length === 0 ? (
        <div className="relative z-[2] py-[60px] text-center text-[var(--text-secondary)]">
          <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface)]"><Trash2 className="h-7 w-7 text-[#4F46E5]" /></div>
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

/* ---------- notification bell ----------
   The header bell: a dot when there are pending shares, and a portal popover listing each
   pending share with Allow / Decline. Same outside-click / Escape dismissal as CardActionMenu. */
function NotificationBell({
  notifications,
  open,
  onToggle,
  onClose,
  onRespond,
}: {
  notifications: ShareNotification[]
  open: boolean
  onToggle: () => void
  onClose: () => void
  onRespond: (id: number, action: 'ACCEPT' | 'DECLINE') => void
}) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)
  const count = notifications.length

  // Anchor the panel under the bell, flush to the right edge of the viewport gutter.
  useEffect(() => {
    if (!open) return
    const update = () => {
      const b = btnRef.current
      if (!b) return
      const r = b.getBoundingClientRect()
      setPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) })
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [open])

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
        aria-label="Notifications"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={onToggle}
        className="relative grid h-[42px] w-[42px] place-items-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-primary)] shadow-[0_8px_22px_-16px_rgba(27,19,38,0.2)] transition-transform hover:-translate-y-px"
      >
        <BellIcon />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#4F46E5] px-1 text-[10px] font-bold text-white ring-2 ring-[var(--surface)]">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && pos && createPortal(
        <div
          ref={panelRef}
          role="menu"
          style={{ position: 'fixed', top: pos.top, right: pos.right, width: 340 }}
          className="z-[300] max-h-[70vh] overflow-y-auto rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-2 text-[var(--text-primary)] shadow-[0_10px_24px_-8px_rgba(27,19,38,0.18),0_24px_60px_-20px_rgba(27,19,38,0.30)] animate-modal-in scrollbar-slim"
        >
          <div className="flex items-center justify-between px-3 py-2">
            <h3 className="m-0 text-[15px] font-extrabold tracking-[-0.01em]" style={{ fontFamily: bricolage }}>Notifications</h3>
            <button onClick={onClose} aria-label="Close" className="grid h-7 w-7 place-items-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--text-primary)]/[0.06] hover:text-[var(--text-primary)]">
              <X size={16} />
            </button>
          </div>

          {count === 0 ? (
            <div className="px-3 py-8 text-center text-[13px] text-[var(--text-secondary)]">
              <div className="mx-auto mb-2 grid h-11 w-11 place-items-center rounded-full bg-[#4F46E5]/[0.08] text-[#4F46E5]"><BellIcon size={18} /></div>
              You’re all caught up.
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {notifications.map((n) => {
                const sw = getSwatch(n.folderColor)
                return (
                  <div key={n.id} className="rounded-xl border border-[var(--border-subtle)] p-3">
                    <p className="m-0 text-[13px] leading-snug">
                      <b className="font-bold">{n.senderNickname}</b> shared {n.fullFolder ? 'a folder' : 'notes'} with you
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="inline-flex min-w-0 items-center gap-1.5 truncate rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: sw.tint, color: sw.swatch }}>
                        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: sw.swatch }} />
                        <span className="truncate">{n.folderName}</span>
                      </span>
                      <span className="whitespace-nowrap text-[11.5px] text-[var(--text-secondary)]">
                        {n.fullFolder ? 'Whole folder' : `${n.noteCount} ${n.noteCount === 1 ? 'note' : 'notes'}`}
                      </span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => onRespond(n.id, 'ACCEPT')}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--btn-primary-bg)] px-3 py-2 text-[12.5px] font-bold text-white transition-transform hover:-translate-y-px"
                      >
                        <Check size={14} strokeWidth={3} /> Allow
                      </button>
                      <button
                        onClick={() => onRespond(n.id, 'DECLINE')}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-[12.5px] font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--text-primary)]/[0.05] hover:text-[var(--text-primary)]"
                      >
                        <X size={14} /> Decline
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>,
        document.body,
      )}
    </>
  )
}
