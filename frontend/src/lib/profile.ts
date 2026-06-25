// Client-side store for the editable profile fields shown on /profile.
//
// The backend User model only carries nickname/email/created_at, so the richer
// profile metadata (names, gender, avatar image) lives in localStorage for this
// sprint. Everything is namespaced by the current user's scope so two accounts
// on the same browser keep separate profiles.
import { currentUserScope, getAuthUser } from './authToken'

export type Gender = '' | 'female' | 'male' | 'nonbinary' | 'prefer-not'

export interface Profile {
  firstName: string
  lastName: string
  email: string
  gender: Gender
  /** Uploaded avatar as a data URL, or '' to fall back to the gradient placeholder. */
  avatar: string
}

const key = () => `note-tracker.profile.${currentUserScope()}`

// Largest avatar file we accept. base64 inflates by ~33%, and localStorage caps
// around 5 MB per origin, so keep the source comfortably under that.
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024 // 2 MB
export const ACCEPTED_AVATAR_TYPES = ['image/png', 'image/jpeg']

function emptyProfile(): Profile {
  // Seed the email from the authenticated account so the field isn't blank.
  return {
    firstName: '',
    lastName: '',
    email: getAuthUser()?.email ?? '',
    gender: '',
    avatar: '',
  }
}

export function getProfile(): Profile {
  if (typeof window === 'undefined') return emptyProfile()
  const raw = window.localStorage.getItem(key())
  if (!raw) return emptyProfile()
  try {
    return { ...emptyProfile(), ...(JSON.parse(raw) as Partial<Profile>) }
  } catch {
    return emptyProfile()
  }
}

export function saveProfile(profile: Profile) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key(), JSON.stringify(profile))
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
