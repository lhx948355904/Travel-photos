import request from './request'
import type { CosCredential, CosUploadResult } from '../types'

export const getCosCredential = (): Promise<CosCredential> => {
  return request.get('/cos/credential')
}

export const uploadToCos = (file: File): Promise<CosUploadResult> => {
  const formData = new FormData()
  formData.append('file', file)
  return request.post('/cos/upload', formData)
}
