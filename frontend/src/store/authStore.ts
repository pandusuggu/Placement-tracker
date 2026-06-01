import { create } from 'zustand'

interface UserProfile {
  id: string
  name: string
  email: string
  avatar?: string
  college?: string
  branch?: string
  graduation_year?: number
  target_role: string
  daily_available_hours: number
}

interface AuthState {
  token: string | null
  user: UserProfile | null
  isAuthenticated: boolean
  setAuth: (token: string, user: UserProfile) => void
  updateProfile: (user: UserProfile) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('token'),
  user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null,
  isAuthenticated: !!localStorage.getItem('token'),
  setAuth: (token, user) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    set({ token, user, isAuthenticated: true })
  },
  updateProfile: (user) => {
    localStorage.setItem('user', JSON.stringify(user))
    set({ user })
  },
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ token: null, user: null, isAuthenticated: false })
  }
}))
