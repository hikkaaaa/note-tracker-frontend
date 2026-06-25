// Stores the JWT returned by the backend so the app can authenticate requests.
//
// "Remember me" decides where the session lives:
//   • remember = true  → localStorage + an explicit 30-day expiry stamp, so the
//     login survives browser restarts on this device until an explicit logout
//     (or the 30 days elapse).
//   • remember = false → sessionStorage, which the browser clears when the last
//     tab/window for the origin closes, so the session does NOT persist across
//     browser restarts.
// The user blob is the safe public fields (no password) for greeting UI.
const tokenKey = 'note-tracker.auth-token'
const userKey = 'note-tracker.auth-user'
const expiryKey = 'note-tracker.auth-expiry'

const REMEMBER_DAYS = 30
const REMEMBER_MS = REMEMBER_DAYS * 24 * 60 * 60 * 1000

export interface AuthUser {
  id: number
  nickname: string
  email: string
}

export function saveAuth(token: string, user: AuthUser, remember = false) {
  if (typeof window === 'undefined') return
  // Start clean so a previous session in the other storage can't linger.
  clearAuth()
  const store = remember ? window.localStorage : window.sessionStorage
  store.setItem(tokenKey, token)
  store.setItem(userKey, JSON.stringify(user))
  if (remember) {
    window.localStorage.setItem(expiryKey, String(Date.now() + REMEMBER_MS))
  }
}

// The storage backing the active session, or null if there is none.
// A remembered session past its 30-day expiry is wiped here, so anything reading
// the token transparently sees a logged-out state once it lapses.
function activeStore(): Storage | null {
  if (typeof window === 'undefined') return null
  if (window.localStorage.getItem(tokenKey)) {
    const expiry = Number(window.localStorage.getItem(expiryKey) ?? 0)
    if (expiry && Date.now() > expiry) {
      clearAuth()
      return null
    }
    return window.localStorage
  }
  if (window.sessionStorage.getItem(tokenKey)) return window.sessionStorage
  return null
}

export function getAuthToken(): string | null {
  return activeStore()?.getItem(tokenKey) ?? null
}

export function getAuthUser(): AuthUser | null {
  const raw = activeStore()?.getItem(userKey)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

// Patch the cached user blob in whichever storage holds the active session, so
// profile edits (e.g. a changed email) are reflected in the greeting UI.
export function updateAuthUser(patch: Partial<AuthUser>) {
  const store = activeStore()
  if (!store) return
  const current = getAuthUser()
  if (!current) return
  store.setItem(userKey, JSON.stringify({ ...current, ...patch }))
}

export function clearAuth() {
  if (typeof window === 'undefined') return
  for (const store of [window.localStorage, window.sessionStorage]) {
    store.removeItem(tokenKey)
    store.removeItem(userKey)
    store.removeItem(expiryKey)
  }
}

// Stable per-user prefix for browser-local caches (e.g. the note editor's offline
// section buffer), so two accounts on the same browser can't read each other's cached
// content. Falls back to 'anon' when logged out.
export function currentUserScope(): string {
  return `u${getAuthUser()?.id ?? 'anon'}`
}
