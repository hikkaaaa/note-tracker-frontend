// The editable profile shown on /profile (names, gender, avatar, email) plus preferences.
//
// Persisted on the backend user row via /api/profile, so it follows the account
// across devices and databases. (It previously lived in browser localStorage keyed
// by numeric user id, which collided whenever the backing database was swapped.)
import { authedFetch } from './api'

export type Gender = '' | 'female' | 'male' | 'nonbinary' | 'prefer-not'
export type DefaultView = 'grid' | 'list'

export interface Profile {
  firstName: string
  lastName: string
  email: string
  gender: Gender
  avatar: string
  // Preferences.
  defaultView: DefaultView
  notifyWeeklySummary: boolean
  notifyFolderShared: boolean
  // Read-only: when the account was created (ISO string; '' before the profile loads).
  createdAt: string
}

// Read-only account metadata + directory for the account overview.
export interface NoteStat {
  id: number
  title: string
  createdAt: string
  storageBytes: number
}

export interface FolderStat {
  id: number
  name: string
  createdAt: string
  noteCount: number
  storageBytes: number
  notes: NoteStat[]
}

export interface ProfileStats {
  createdAt: string
  totalFolders: number
  totalNotes: number
  totalSections: number
  storageBytes: number
  folders: FolderStat[]
}

// Derive First/Last name from the account nickname so the user never types them:
// a single word fills First name only; two+ words split into First + the rest.
export function deriveNames(nickname: string | undefined): { firstName: string; lastName: string } {
  const parts = (nickname ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: '', lastName: '' }
  if (parts.length === 1) return { firstName: parts[0], lastName: '' }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

// Largest avatar file we accept. base64 inflates by ~33%, so the backend caps the
// stored string a bit higher; keep the source file comfortably small.
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024 // 2 MB
export const ACCEPTED_AVATAR_TYPES = ['image/png', 'image/jpeg']
export const MAX_NAME_LENGTH = 50

export const emptyProfile = (): Profile => ({
  firstName: '',
  lastName: '',
  email: '',
  gender: '',
  avatar: '',
  defaultView: 'grid',
  notifyWeeklySummary: false,
  notifyFolderShared: true,
  createdAt: '',
})

// The API speaks snake_case; the app speaks camelCase.
function fromApi(d: Record<string, unknown>): Profile {
  return {
    firstName: (d.first_name as string) ?? '',
    lastName: (d.last_name as string) ?? '',
    email: (d.email as string) ?? '',
    gender: ((d.gender as string) ?? '') as Gender,
    avatar: (d.avatar as string) ?? '',
    defaultView: ((d.default_view as string) === 'list' ? 'list' : 'grid'),
    notifyWeeklySummary: Boolean(d.notify_weekly_summary),
    notifyFolderShared: Boolean(d.notify_folder_shared),
    createdAt: (d.created_at as string) ?? '',
  }
}

// camelCase profile keys → the snake_case field the API expects.
const API_KEYS: Record<string, string> = {
  firstName: 'first_name',
  lastName: 'last_name',
  email: 'email',
  gender: 'gender',
  avatar: 'avatar',
  defaultView: 'default_view',
  notifyWeeklySummary: 'notify_weekly_summary',
  notifyFolderShared: 'notify_folder_shared',
}

export async function fetchProfile(): Promise<Profile> {
  const res = await authedFetch('/api/profile')
  if (!res.ok) throw new Error('Could not load your profile.')
  return fromApi(await res.json())
}

// Persist a subset of the profile. Only the given keys are sent (the backend patches
// with exclude_unset), so e.g. flipping a preference toggle never re-uploads the avatar.
export async function patchProfile(patch: Partial<Profile>): Promise<Profile> {
  const body: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(patch)) {
    const apiKey = API_KEYS[key]
    if (apiKey) body[apiKey] = value
  }
  const res = await authedFetch('/api/profile', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await errorDetail(res, 'Could not save your profile.'))
  return fromApi(await res.json())
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const res = await authedFetch('/api/profile/password', {
    method: 'PUT',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  })
  if (!res.ok) throw new Error(await errorDetail(res, 'Could not change your password.'))
}

export async function fetchProfileStats(): Promise<ProfileStats> {
  const res = await authedFetch('/api/profile/stats')
  if (!res.ok) throw new Error('Could not load your account stats.')
  const d = await res.json()
  return {
    createdAt: d.created_at ?? '',
    totalFolders: d.total_folders ?? 0,
    totalNotes: d.total_notes ?? 0,
    totalSections: d.total_sections ?? 0,
    storageBytes: d.storage_bytes ?? 0,
    folders: (d.folders ?? []).map((f: Record<string, unknown>): FolderStat => ({
      id: f.id as number,
      name: (f.name as string) ?? 'Untitled',
      createdAt: (f.created_at as string) ?? '',
      noteCount: (f.note_count as number) ?? 0,
      storageBytes: (f.storage_bytes as number) ?? 0,
      notes: ((f.notes as Record<string, unknown>[]) ?? []).map((n): NoteStat => ({
        id: n.id as number,
        title: (n.title as string) ?? 'Untitled',
        createdAt: (n.created_at as string) ?? '',
        storageBytes: (n.storage_bytes as number) ?? 0,
      })),
    })),
  }
}

// Pull the human-readable `detail` out of a FastAPI error body, falling back to a generic
// message when the response isn't the JSON we expect.
async function errorDetail(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json()
    if (body?.detail && typeof body.detail === 'string') return body.detail
  } catch {
    // non-JSON error body — keep the generic message
  }
  return fallback
}

// Validate a chosen avatar file and resolve to a data URL, or reject with a
// human-readable reason for the UI to surface.
export function readAvatarFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
      reject(new Error('Please choose a PNG or JPG image.'))
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      reject(new Error('That image is too large. Please pick one under 2 MB.'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read that file. Please try another.'))
    reader.readAsDataURL(file)
  })
}

// Present a byte count as a compact KB / MB string for the stats block.
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
