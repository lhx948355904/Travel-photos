import COS from 'cos-js-sdk-v5'
import type { CosCredential } from '../types'

export function initCos(credential: CosCredential) {
  return new COS({
    getAuthorization: (_options: any, callback: any) => {
      callback({
        TmpSecretId: credential.tmpSecretId,
        TmpSecretKey: credential.tmpSecretKey,
        SecurityToken: credential.sessionToken,
        StartTime: credential.startTime,
        ExpiredTime: credential.expiredTime,
      })
    },
  })
}

export function uploadFile(
  credential: CosCredential,
  file: File,
  key: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  const cos = initCos(credential)

  return new Promise((resolve, reject) => {
    cos.uploadFile(
      {
        Bucket: credential.bucket,
        Region: credential.region,
        Key: key,
        Body: file,
        onProgress: (progressData: any) => {
          const percent = Math.round((progressData.loaded / progressData.total) * 100)
          onProgress?.(percent)
        },
      },
      (err: any, data: any) => {
        if (err) {
          reject(err)
        } else {
          const location = data.Location || ''
          if (location.startsWith('http')) {
            resolve(location)
          } else {
            resolve(`https://${location}`)
          }
        }
      }
    )
  })
}
