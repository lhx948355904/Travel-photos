import COS from 'cos-js-sdk-v5'
import type { CosCredential } from '../types'

let cosInstance: COS | null = null

export function initCos(credential: CosCredential) {
  cosInstance = new COS({
    getAuthorization: (options: any, callback: any) => {
      callback({
        TmpSecretId: credential.tmpSecretId,
        TmpSecretKey: credential.tmpSecretKey,
        SecurityToken: credential.sessionToken,
        StartTime: credential.startTime,
        ExpiredTime: credential.expiredTime,
      })
    },
  })
  return cosInstance
}

export function uploadFile(
  credential: CosCredential,
  file: File,
  key: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  const cos = cosInstance || initCos(credential)

  return new Promise((resolve, reject) => {
    cos.uploadFile(
      {
        Bucket: credential.bucket,
        Region: credential.region,
        Key: key,
        FilePath: file,
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
