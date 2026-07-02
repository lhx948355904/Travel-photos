import { create } from 'zustand'
import type { User } from '../types'

interface AuthState {
  token: string | null
  user: User | null
  isLoggedIn: boolean
  isAdmin: boolean
  setAuth: (token: string, user: User) => void
  clearAuth: () => void
  logout: () => void
}

const storedToken = localStorage.getItem('token')
const storedUser = localStorage.getItem('user')

const parseStoredUser = (): User | null => {
  if (!storedUser) return null
  try {
    return JSON.parse(storedUser) as User
  } catch {
    localStorage.removeItem('user')
    return null
  }
}

const initialUser = parseStoredUser()

export const useAuthStore = create<AuthState>((set) => ({
  token: storedToken,
  user: initialUser,
  isLoggedIn: !!storedToken && !!initialUser,
  isAdmin: initialUser?.role === 'ADMIN',
  setAuth: (token, user) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    set({
      token,
      user,
      isLoggedIn: true,
      isAdmin: user.role === 'ADMIN',
    })
  },
  clearAuth: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ token: null, user: null, isLoggedIn: false, isAdmin: false })
  },
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ token: null, user: null, isLoggedIn: false, isAdmin: false })
  },
}))
