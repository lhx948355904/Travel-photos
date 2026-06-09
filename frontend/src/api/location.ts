import request from './request'
import type { Location, PhotoUploadInfo } from '../types'

export interface LocationCreateParams {
  name: string
  description?: string
  longitude: number
  latitude: number
  travelDate?: string
  coverIndex?: number
  photos: PhotoUploadInfo[]
}

export interface LocationUpdateParams {
  name?: string
  description?: string
  longitude?: number
  latitude?: number
  travelDate?: string
  coverPhotoId?: number
}

export const getLocations = (bbox?: string): Promise<Location[]> => {
  return request.get('/locations', { params: { bbox } })
}

export const getLocationDetail = (id: number): Promise<Location> => {
  return request.get(`/locations/${id}`)
}

export const createLocation = (params: LocationCreateParams): Promise<{ id: number }> => {
  return request.post('/locations', params)
}

export const updateLocation = (id: number, params: LocationUpdateParams): Promise<void> => {
  return request.put(`/locations/${id}`, params)
}

export const deleteLocation = (id: number): Promise<void> => {
  return request.delete(`/locations/${id}`)
}

export const addPhotos = (id: number, photos: PhotoUploadInfo[]): Promise<void> => {
  return request.post(`/locations/${id}/photos`, photos)
}

export const deletePhoto = (id: number): Promise<void> => {
  return request.delete(`/photos/${id}`)
}
