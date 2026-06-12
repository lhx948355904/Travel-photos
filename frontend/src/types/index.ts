export type Orientation = 'landscape' | 'portrait' | 'square';

export interface Photo {
  id: number;
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
  orientation: Orientation;
  shotDate?: string;
  sortOrder: number;
}

export interface Location {
  id: number;
  name: string;
  description?: string;
  longitude: number;
  latitude: number;
  travelDate?: string;
  coverPhotoId?: number;
  coverThumbUrl?: string;
  photoCount: number;
  photos?: Photo[];
}

export interface PhotoUploadInfo {
  cosKey: string;
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
  orientation: Orientation;
  fileSize: number;
  shotDate?: string;
}

export interface CosCredential {
  tmpSecretId: string;
  tmpSecretKey: string;
  sessionToken: string;
  bucket: string;
  region: string;
  startTime: number;
  expiredTime: number;
  allowPrefix: string;
}

export interface CosUploadResult {
  cosKey: string;
  url: string;
}
