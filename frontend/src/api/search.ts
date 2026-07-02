import request from './request'
import type { SearchPhotoResult } from '../types'

export const searchPhotos = (q: string, limit = 12): Promise<SearchPhotoResult[]> => {
  return request.get('/search/photos', { params: { q, limit } })
}
