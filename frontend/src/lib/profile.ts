// The editable profile shown on /profile (names, gender, avatar, email).
//
// Persisted on the backend user row via /api/profile, so it follows the account
// across devices and databases. (It previously lived in browser localStorage keyed
// by numeric user id, which collided whenever the backing database was swapped.)
import { authedFetch } from './api'

export type Gender = '' | 'female' | 'male' | 'nonbinary' | 'prefer-not'

export interface Profile {
  firstName: string
  lastName: string
  email: string
  gender: Gender
  avatar: string
}

// Largest avatar file we accept. base64 inflates by ~33%, so the backend caps the
// stored string a bit higher; keep the source file comfortably small.
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024 // 2 MB
export const ACCEPTED_AVATAR_TYPES = ['image/png', 'image/jpeg']

export const emptyProfile = (): Profile => ({
  firstName: '',
  lastName: '',
  email: '',
  gender: '',
  avatar: '',
})

// The API speaks snake_case; the app speaks camelCase.
function fromApi(d: Record<string, unknown>): Profile {
  return {
    firstName: (d.first_name as string) ?? '',
    lastName: (d.last_name as string) ?? '',
    email: (d.email as string) ?? '',
    gender: ((d.gender as string) ?? '') as Gender,
    avatar: (d.avatar as string) ?? '',
  }
}

export async function fetchProfile(): Promise<Profile> {
  const res = await authedFetch('/api/profile')
  if (!res.ok) throw new Error('Could not load your profile.')
  return fromApi(await res.json())
}

export async function saveProfile(profile: Profile): Promise<Profile> {
  const res = await authedFetch('/api/profile', {
    method: 'PUT',
    body: JSON.stringify({
      first_name: profile.firstName,
      last_name: profile.lastName,
      email: profile.email,
      gender: profile.gender,
      avatar: profile.avatar,
    }),
  })
  if (!res.ok) {
    let message = 'Could not save your profile.'
    try {
      const body = await res.json()
      if (body?.detail) message = body.detail
    } catch {
      // non-JSON error body — keep the generic message
    }
    throw new Error(message)
  }
  return fromApi(await res.json())
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
