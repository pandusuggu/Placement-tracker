import { create } from 'zustand'

interface ThemeState {
  theme: 'light' | 'dark'
  toggleTheme: () => void
  initTheme: () => void
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'dark', // default to premium dark mode
  toggleTheme: () => {
    const nextTheme = get().theme === 'light' ? 'dark' : 'light'
    localStorage.setItem('theme', nextTheme)
    
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    set({ theme: nextTheme })
  },
  initTheme: () => {
    const storedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null
    const preferredTheme = storedTheme || 'dark'
    
    if (preferredTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    set({ theme: preferredTheme })
  }
}))
