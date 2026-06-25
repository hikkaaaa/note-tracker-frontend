// Global theme engine. ThemeProvider keeps the chosen theme in state, persists
// it, and reflects it onto <html data-theme="…">. All actual colors are expressed
// as CSS variables (--bg-primary, --text-primary, …) in index.css and keyed off
// that attribute, so components opt in by reading the variables rather than
// branching on the theme value — this scales to new themes without touching
// component code.
//
// The context, types, and useTheme hook live in ./themeContext so this file can
// export only the provider component (keeps Fast Refresh working).
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  THEME_STORAGE_KEY,
  ThemeContext,
  readStoredTheme,
  type Theme,
} from './themeContext'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readStoredTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}
