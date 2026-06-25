// Theme context, types, and the consumer hook. Kept in a component-free module
// so the provider file can export only a component (keeps Fast Refresh happy)
// and so any component can read the theme via useTheme().
import { createContext, useContext } from 'react'

export const THEMES = ['light', 'dark', 'pink'] as const
export type Theme = (typeof THEMES)[number]

export const THEME_STORAGE_KEY = 'note-tracker.theme'
const DEFAULT_THEME: Theme = 'light'

export function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return DEFAULT_THEME
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  return THEMES.includes(stored as Theme) ? (stored as Theme) : DEFAULT_THEME
}

// Apply immediately on module load (before React mounts) so the first paint is
// already themed and we avoid a light→dark flash for remembered dark/pink users.
if (typeof document !== 'undefined') {
  document.documentElement.dataset.theme = readStoredTheme()
}

export interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
