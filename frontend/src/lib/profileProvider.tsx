import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { getAuthToken } from './authToken'
import { fetchProfile, type Profile } from './profile'
import { ProfileContext } from './profileContext'

// Loads the profile once a session exists and shares it app-wide. Consumers read
// `profile` for live UI (the header avatar), call `setProfile` after a save, and
// `refresh` after login / on logout.
export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)

  const refresh = useCallback(async () => {
    if (!getAuthToken()) {
      setProfile(null)
      return
    }
    try {
      setProfile(await fetchProfile())
    } catch {
      // Leave whatever we have; consumers fall back to the auth-user nickname/initial.
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return (
    <ProfileContext.Provider value={{ profile, setProfile, refresh }}>
      {children}
    </ProfileContext.Provider>
  )
}
