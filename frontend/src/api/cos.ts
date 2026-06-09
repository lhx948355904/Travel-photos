import request from './request'
import type { CosCredential } from '../types'

export const getCosCredential = (): Promise<CosCredential> => {
  return request.get('/cos/credential')
}
