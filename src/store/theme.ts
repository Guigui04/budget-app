import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemePreference = 'light' | 'dark' | 'system'
type Resolved = 'light' | 'dark'

interface ThemeState {
  preference: ThemePreference
  setPreference: (p: ThemePreference) => void
}

function systemTheme(): Resolved {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function resolveTheme(pref: ThemePreference): Resolved {
  return pref === 'system' ? systemTheme() : pref
}

/** Apply the resolved theme to <html> and the browser theme-color. */
export function applyTheme(pref: ThemePreference): void {
  const resolved = resolveTheme(pref)
  document.documentElement.setAttribute('data-theme', resolved)
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      preference: 'system',
      setPreference: (preference) => {
        applyTheme(preference)
        set({ preference })
      },
    }),
    {
      name: 'foyer-theme',
      onRehydrateStorage: () => (state) => {
        applyTheme(state?.preference ?? 'system')
      },
    },
  ),
)

// Keep "system" preference live when the OS theme changes.
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (useThemeStore.getState().preference === 'system') applyTheme('system')
  })
}
