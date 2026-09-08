export type Orientation = 'landscape' | 'portrait' | 'square'
export type PhotoStatus = 'pending' | 'approved' | 'rejected'

export interface Photo {
  id: number
  url: string
  thumbUrl: string
  width: number
  height: number
  orientation: Orientation
  shotDate?: string
  status?: PhotoStatus
  reviewReason?: string
  caption?: string
  tags?: string
  sortOrder: number
}

export interface Location {
  id: number
  name: string
  description?: string
  longitude: number
  latitude: number
  travelDate?: string
  coverPhotoId?: number
  coverThumbUrl?: string
  photoCount: number
  photos?: Photo[]
}

export interface PhotoUploadInfo {
  cosKey: string
  url: string
  thumbUrl: string
  width: number
  height: number
  orientation: Orientation
  fileSize: number
  shotDate?: string
  caption?: string
  tags?: string
}

export interface CosCredential {
  tmpSecretId: string
  tmpSecretKey: string
  sessionToken: string
  bucket: string
  region: string
  startTime: number
  expiredTime: number
  allowPrefix: string
  publicReadAclEnabled: boolean
}

export interface CosUploadResult {
  cosKey: string
  url: string
  status?: PhotoStatus
  reviewReason?: string
}

export interface SearchPhotoResult {
  photoId: number
  locationId: number
  locationName: string
  url: string
  thumbUrl: string
  shotDate?: string
  caption?: string
  tags?: string
  score: number
}

export type RagSearchMode = 'rag' | 'semantic' | 'keyword'

export interface PhotoIndexCoverage {
  ready: number
  total: number
}

export interface RagPhotoSearchResponse {
  answer: string | null
  mode: RagSearchMode
  citationPhotoIds: number[]
  evidence: SearchPhotoResult[]
  indexCoverage: PhotoIndexCoverage
  warning: string | null
  requestId: string
}

export interface PhotoIndexStatus {
  total: number
  ready: number
  pending: number
  processing: number
  failed: number
  lastIndexedAt: string | null
  aiEnabled: boolean
  providerReady: boolean
}

export interface PhotoIndexRebuildResult {
  queued: number
}
