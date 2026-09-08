import COS from 'cos-js-sdk-v5'
import type { CosCredential } from '../types'

type CredentialProvider = () => Promise<CosCredential>

const CREDENTIAL_REFRESH_WINDOW_SECONDS = 60
const MULTIPART_THRESHOLD = 8 * 1024 * 1024
const CHUNK_SIZE = 8 * 1024 * 1024

export function initCos(initialCredential: CosCredential, getCredential: CredentialProvider) {
  let credential = initialCredential

  return new COS({
    ChunkRetryTimes: 3,
    ChunkParallelLimit: 3,
    FileParallelLimit: 3,
    SliceSize: MULTIPART_THRESHOLD,
    ChunkSize: CHUNK_SIZE,
    Timeout: 120000,
    UploadCheckContentMd5: true,
    UploadAddMetaMd5: true,
    getAuthorization: (_options: any, callback: any) => {
      const now = Math.floor(Date.now() / 1000)
      const credentialPromise = credential.expiredTime - now > CREDENTIAL_REFRESH_WINDOW_SECONDS
        ? Promise.resolve(credential)
        : getCredential().then((nextCredential) => {
            credential = nextCredential
            return nextCredential
          })

      void credentialPromise.then((current) => {
        callback({
          TmpSecretId: current.tmpSecretId,
          TmpSecretKey: current.tmpSecretKey,
          SecurityToken: current.sessionToken,
          StartTime: current.startTime,
          ExpiredTime: current.expiredTime,
        })
      }).catch(() => callback(''))
    },
  })
}

export function uploadFile(
  credential: CosCredential,
  getCredential: CredentialProvider,
  file: File,
  key: string,
  onProgress?: (percent: number) => void
): Promise<void> {
  const cos = initCos(credential, getCredential)

  // cos-js-sdk-v5 uses the legacy lastModifiedDate field when matching a file
  // to its cached UploadId. Modern browsers expose lastModified instead, so
  // provide the compatibility field to make retries reuse completed parts.
  const resumableFile = file as File & { lastModifiedDate?: Date }
  if (!resumableFile.lastModifiedDate) {
    Object.defineProperty(resumableFile, 'lastModifiedDate', {
      configurable: true,
      value: new Date(file.lastModified),
    })
  }

  return new Promise((resolve, reject) => {
    cos.uploadFile(
      {
        Bucket: credential.bucket,
        Region: credential.region,
        Key: key,
        Body: resumableFile,
        ContentType: file.type || 'application/octet-stream',
        ACL: credential.publicReadAclEnabled ? 'public-read' : 'default',
        SliceSize: MULTIPART_THRESHOLD,
        ChunkSize: CHUNK_SIZE,
        AsyncLimit: 3,
        UploadAddMetaMd5: true,
        onHashProgress: (progressData: any) => {
          const percent = Math.round((progressData.loaded / progressData.total) * 10)
          onProgress?.(Math.max(1, percent))
        },
        onProgress: (progressData: any) => {
          const percent = 10 + Math.round((progressData.loaded / progressData.total) * 85)
          onProgress?.(percent)
        },
      },
      (err: any) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      }
    )
  })
}
