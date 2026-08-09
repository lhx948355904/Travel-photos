import request from './request'
import type {
  PhotoIndexRebuildResult,
  PhotoIndexStatus,
  RagPhotoSearchResponse,
  SearchPhotoResult,
} from '../types'

export const searchPhotos = (q: string, limit = 12): Promise<SearchPhotoResult[]> => {
  return request.get('/search/photos', { params: { q, limit } })
}

export const searchPhotosWithRag = (
  query: string,
  limit = 8,
): Promise<RagPhotoSearchResponse> => {
  return request.post('/search/photos/rag', { query, limit }, { timeout: 60000 })
}

export const getPhotoIndexStatus = (): Promise<PhotoIndexStatus> => {
  return request.get('/ai/photo-index/status')
}

export const rebuildPhotoIndex = (
  scope: 'missing' | 'all',
): Promise<PhotoIndexRebuildResult> => {
  return request.post('/ai/photo-index/rebuild', { scope })
}
