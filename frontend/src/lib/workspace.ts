// Backend-backed workspace data layer. Folders, notes and their sections live in the
// FastAPI/SQLite backend, scoped to the logged-in user — this module is the typed,
// authenticated bridge the pages use instead of touching localStorage. Responses are
// mapped to the existing Local* shapes so the UI components render unchanged.
import { authedFetch } from './api'
import { normalizeFolderColor } from './localWorkspace'
import type { FolderColor, LocalFolder, LocalNote } from './localWorkspace'

interface ApiNote {
  id: number
  title: string
  purpose?: string | null
  folder_id: number
  starred?: boolean
  pinned?: boolean
  created_at?: string | null
  updated_at?: string | null
  read_only?: boolean
}

interface ApiFolder {
  id: number
  name: string
  purpose?: string | null
  color?: string | null
  pinned?: boolean
  archived?: boolean
  last_activity?: string | null
  notes?: ApiNote[]
  read_only?: boolean
}

// Notes have no color of their own; they inherit their parent folder's color at render time.
function mapNote(n: ApiNote): LocalNote {
  return {
    id: n.id,
    title: n.title,
    purpose: n.purpose ?? undefined,
    created_at: n.created_at ?? '',
    updated_at: n.updated_at ?? '',
    starred: Boolean(n.starred),
    pinned: Boolean(n.pinned),
    readOnly: n.read_only ? true : undefined,
  }
}

function mapFolder(f: ApiFolder): LocalFolder {
  return {
    id: f.id,
    name: f.name,
    purpose: f.purpose ?? '',
    color: normalizeFolderColor(f.color ?? undefined),
    pinned: Boolean(f.pinned),
    archived: Boolean(f.archived),
    lastActivity: f.last_activity ?? '',
    notes: (f.notes ?? []).map(mapNote),
    readOnly: f.read_only ? true : undefined,
  }
}

export async function fetchFolders(): Promise<LocalFolder[]> {
  const res = await authedFetch('/folders/')
  if (!res.ok) throw new Error('Could not load your folders.')
  const data = (await res.json()) as ApiFolder[]
  return data.map(mapFolder)
}

export async function fetchFolder(id: number): Promise<LocalFolder | null> {
  const res = await authedFetch(`/folders/${id}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Could not load that folder.')
  return mapFolder(await res.json())
}

export async function createFolder(input: {
  name: string
  purpose: string
  color: FolderColor
}): Promise<LocalFolder> {
  const res = await authedFetch('/folders/', { method: 'POST', body: JSON.stringify(input) })
  if (!res.ok) throw new Error('Could not create the folder.')
  return mapFolder(await res.json())
}

export async function updateFolder(
  id: number,
  patch: { name?: string; purpose?: string; color?: FolderColor; pinned?: boolean; archived?: boolean },
): Promise<LocalFolder> {
  const res = await authedFetch(`/folders/${id}`, { method: 'PUT', body: JSON.stringify(patch) })
  if (!res.ok) throw new Error('Could not update the folder.')
  return mapFolder(await res.json())
}

export async function deleteFolder(id: number): Promise<void> {
  const res = await authedFetch(`/folders/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Could not delete the folder.')
}

export async function createNote(
  folderId: number,
  input: { title: string; purpose: string },
): Promise<LocalNote> {
  const res = await authedFetch(`/folders/${folderId}/notes/`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error('Could not create the note.')
  return mapNote(await res.json())
}

export async function updateNote(
  id: number,
  patch: { title?: string; purpose?: string; starred?: boolean; pinned?: boolean },
): Promise<LocalNote> {
  const res = await authedFetch(`/notes/${id}`, { method: 'PUT', body: JSON.stringify(patch) })
  if (!res.ok) throw new Error('Could not update the note.')
  return mapNote(await res.json())
}

export async function deleteNote(id: number): Promise<void> {
  const res = await authedFetch(`/notes/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Could not delete the note.')
}

// --- TRASH ---
// A folder shown in the Trash grid. It's there either because the folder itself was
// trashed (folderDeleted=true → opening reveals all its notes) or because it's a live
// folder holding trashed notes (folderDeleted=false → opening reveals only those).
export interface TrashFolderItem {
  id: number
  name: string
  purpose: string
  color: FolderColor
  folderDeleted: boolean
  trashedCount: number
  deletedAt: string | null
}

interface ApiTrashFolder {
  id: number
  name: string
  purpose?: string | null
  color?: string | null
  folder_deleted: boolean
  trashed_count: number
  deleted_at?: string | null
}

export async function fetchTrash(): Promise<TrashFolderItem[]> {
  const res = await authedFetch('/trash/')
  if (!res.ok) throw new Error('Could not load Trash.')
  const data = (await res.json()) as ApiTrashFolder[]
  return data.map((f) => ({
    id: f.id,
    name: f.name,
    purpose: f.purpose ?? '',
    color: normalizeFolderColor(f.color ?? undefined),
    folderDeleted: f.folder_deleted,
    trashedCount: f.trashed_count,
    deletedAt: f.deleted_at ?? null,
  }))
}

export async function fetchTrashFolderNotes(folderId: number): Promise<LocalNote[]> {
  const res = await authedFetch(`/trash/folders/${folderId}`)
  if (!res.ok) throw new Error('Could not load trashed notes.')
  return ((await res.json()) as ApiNote[]).map(mapNote)
}

export async function restoreFolder(id: number): Promise<void> {
  const res = await authedFetch(`/folders/${id}/restore`, { method: 'POST' })
  if (!res.ok) throw new Error('Could not restore the folder.')
}

export async function restoreNote(id: number): Promise<void> {
  const res = await authedFetch(`/notes/${id}/restore`, { method: 'POST' })
  if (!res.ok) throw new Error('Could not restore the note.')
}

export async function purgeFolderForever(id: number): Promise<void> {
  const res = await authedFetch(`/trash/folders/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Could not permanently delete the folder.')
}

export async function purgeNoteForever(id: number): Promise<void> {
  const res = await authedFetch(`/trash/notes/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Could not permanently delete the note.')
}

// --- SHARING ---
// One pending share as shown in the recipient's notification panel.
export interface ShareNotification {
  id: number
  senderNickname: string
  folderName: string
  folderColor: FolderColor
  fullFolder: boolean
  noteCount: number
  createdAt: string | null
}

interface ApiNotification {
  id: number
  sender_nickname: string
  folder_name: string
  folder_color?: string | null
  full_folder: boolean
  note_count: number
  created_at?: string | null
}

// A folder shared with (and accepted by) the current user — read-only, tagged with the sender.
export interface SharedFolder extends LocalFolder {
  sharedBy: string
  shareId: number
}

interface ApiSharedFolder extends ApiFolder {
  share_id: number
  shared_by: string
}

// Share a folder (fullFolder) or a subset of its notes (noteIds) with a user by nickname.
// Surfaces the backend's error message (unknown nickname / self-share) so the modal can show it.
export async function shareResource(input: {
  recipientNickname: string
  folderId: number
  fullFolder: boolean
  noteIds: number[]
}): Promise<void> {
  const res = await authedFetch('/api/shares', {
    method: 'POST',
    body: JSON.stringify({
      recipient_nickname: input.recipientNickname,
      folder_id: input.folderId,
      full_folder: input.fullFolder,
      note_ids: input.noteIds,
    }),
  })
  if (!res.ok) {
    let detail = 'Could not share that.'
    try { detail = (await res.json())?.detail ?? detail } catch { /* keep default */ }
    throw new Error(detail)
  }
}

export async function fetchNotifications(): Promise<ShareNotification[]> {
  const res = await authedFetch('/api/notifications')
  if (!res.ok) throw new Error('Could not load notifications.')
  const data = (await res.json()) as ApiNotification[]
  return data.map((n) => ({
    id: n.id,
    senderNickname: n.sender_nickname,
    folderName: n.folder_name,
    folderColor: normalizeFolderColor(n.folder_color ?? undefined),
    fullFolder: n.full_folder,
    noteCount: n.note_count,
    createdAt: n.created_at ?? null,
  }))
}

export async function respondToShare(id: number, action: 'ACCEPT' | 'DECLINE'): Promise<void> {
  const res = await authedFetch(`/api/shares/${id}/respond`, {
    method: 'PUT',
    body: JSON.stringify({ action }),
  })
  if (!res.ok) throw new Error('Could not update the notification.')
}

export async function fetchSharedFolders(): Promise<SharedFolder[]> {
  const res = await authedFetch('/api/shared')
  if (!res.ok) throw new Error('Could not load shared folders.')
  const data = (await res.json()) as ApiSharedFolder[]
  return data.map((f) => ({
    ...mapFolder(f),
    readOnly: true,
    sharedBy: f.shared_by,
    shareId: f.share_id,
  }))
}
