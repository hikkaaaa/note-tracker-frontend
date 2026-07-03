// Shared profile state so an edit on /profile reflects instantly across the app
// (e.g. the dashboard header avatar) without a manual refresh. Kept component-free
// so the provider file can export only a component (Fast Refresh requirement), like
// the theme context/provider split.
import { createContext, useContext } from 'react'
import type { Profile } from './profile'

export interface ProfileContextValue {
  /** The signed-in user's profile, or null before it loads / when logged out. */
  profile: Profile | null
  /** Replace the cached profile (e.g. right after a save) so consumers update live. */
  setProfile: (profile: Profile | null) => void
  /** Re-fetch from the backend (e.g. after login) or clear it when logged out. */
  refresh: () => Promise<void>
}

export const ProfileContext = createContext<ProfileContextValue | null>(null)

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile must be used within a ProfileProvider')
  return ctx
}
