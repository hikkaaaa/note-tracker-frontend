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
}

interface ApiFolder {
  id: number
  name: string
  purpose?: string | null
  color?: string | null
  notes?: ApiNote[]
}

// The backend has no per-note created_at column yet, so notes carry an empty created_at
// (the UI falls back gracefully). Notes have no color of their own; they inherit their
// parent folder's color at render time.
function mapNote(n: ApiNote): LocalNote {
  return { id: n.id, title: n.title, purpose: n.purpose ?? undefined, created_at: '' }
}

function mapFolder(f: ApiFolder): LocalFolder {
  return {
    id: f.id,
    name: f.name,
    purpose: f.purpose ?? '',
    color: normalizeFolderColor(f.color ?? undefined),
    notes: (f.notes ?? []).map(mapNote),
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
  patch: { name?: string; purpose?: string; color?: FolderColor },
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
  patch: { title?: string; purpose?: string },
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
