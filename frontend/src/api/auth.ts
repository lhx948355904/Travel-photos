import request from './request'

export interface LoginParams {
  username: string
  password: string
}

export interface LoginResult {
  token: string
  expiresIn: number
}

export const login = (params: LoginParams): Promise<LoginResult> => {
  return request.post('/auth/login', params)
}
