// Single source of truth for the backend base URL. Override per-environment with
// the VITE_API_BASE env var (see frontend/.env.example); falls back to the local
// FastAPI dev server so `npm run dev` works with no extra setup.
import { getAuthToken, clearAuth } from './authToken'

export const API_BASE =
  import.meta.env.VITE_API_BASE ?? 'http://localhost:8000'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

// Fetch a backend path with the stored JWT attached. `path` is everything after the
// API base (e.g. `/folders/`). JSON bodies get a Content-Type automatically.
//
// On a 401 the token is stale/missing: clear it and bounce to /login (once), then throw
// so callers stop. This is the single place the app reacts to an expired session, which
// is why every authed request should go through here rather than a bare fetch().
export async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getAuthToken()
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers })

  if (res.status === 401) {
    clearAuth()
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.assign('/login')
    }
    throw new ApiError(401, 'Your session has expired. Please log in again.')
  }
  return res
}
