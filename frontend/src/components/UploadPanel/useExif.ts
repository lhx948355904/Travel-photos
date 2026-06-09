import { useCallback } from 'react'
import exifr from 'exifr'
import { wgs84togcj02 } from '../../utils/image'

export interface ExifData {
  longitude?: number
  latitude?: number
  shotDate?: string
}

export function useExif() {
  const readExif = useCallback(async (file: File): Promise<ExifData> => {
    try {
      const exif = await exifr.parse(file, {
        gps: true,
        exif: true,
      })

      const result: ExifData = {}

      if (exif?.longitude && exif?.latitude) {
        const [gcjLng, gcjLat] = wgs84togcj02(exif.longitude, exif.latitude)
        result.longitude = gcjLng
        result.latitude = gcjLat
      }

      if (exif?.DateTimeOriginal) {
        const date = new Date(exif.DateTimeOriginal)
        result.shotDate = date.toISOString().split('T')[0]
      } else if (exif?.CreateDate) {
        const date = new Date(exif.CreateDate)
        result.shotDate = date.toISOString().split('T')[0]
      }

      return result
    } catch {
      return {}
    }
  }, [])

  return { readExif }
}
