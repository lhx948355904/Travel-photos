import { create } from 'zustand'

interface AuthState {
  token: string | null
  isAdmin: boolean
  setToken: (token: string | null) => void
  logout: () => void
}

const storedToken = localStorage.getItem('token')

export const useAuthStore = create<AuthState>((set) => ({
  token: storedToken,
  isAdmin: !!storedToken,
  setToken: (token) => {
    if (token) {
      localStorage.setItem('token', token)
      set({ token, isAdmin: true })
    } else {
      localStorage.removeItem('token')
      set({ token: null, isAdmin: false })
    }
  },
  logout: () => {
    localStorage.removeItem('token')
    set({ token: null, isAdmin: false })
  },
}))
