import request from './request'
import type { AuthResult, User } from '../types'

export interface LoginParams {
  username: string
  password: string
}

export interface RegisterParams {
  username: string
  password: string
}

export const register = (params: RegisterParams): Promise<User> => {
  return request.post('/auth/register', params)
}

export const login = (params: LoginParams): Promise<AuthResult> => {
  return request.post('/auth/login', params)
}
