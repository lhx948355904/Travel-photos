import { create } from 'zustand'

const AUTH_TOKEN_KEY = 'travel-photo-map-admin-token'

interface AuthState {
  token: string | null
  isAdmin: boolean
  setToken: (token: string) => void
  logout: () => void
}

const getInitialToken = () => {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(AUTH_TOKEN_KEY)
}

export const useAuthStore = create<AuthState>((set) => {
  const token = getInitialToken()

  return {
    token,
    isAdmin: Boolean(token),
    setToken: (nextToken) => {
      window.localStorage.setItem(AUTH_TOKEN_KEY, nextToken)
      set({ token: nextToken, isAdmin: true })
    },
    logout: () => {
      window.localStorage.removeItem(AUTH_TOKEN_KEY)
      set({ token: null, isAdmin: false })
    },
  }
})
