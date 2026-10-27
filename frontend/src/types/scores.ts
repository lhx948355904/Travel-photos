export interface ScoreFrame {
  frameNumber: number
  pointsOne: number
  pointsTwo: number
}

export interface ScoreRecord {
  id: number
  title: string
  playerOne: string
  playerTwo: string
  scoreOne: number
  scoreTwo: number
  playedAt: string
  venue: string | null
  note: string | null
  imageKey: string | null
  imageUrl: string | null
  images?: ScoreImage[]
  updatedAt: string
  frames: ScoreFrame[]
}

export type ScoreInput = Omit<ScoreRecord, 'id' | 'imageUrl' | 'updatedAt' | 'frames' | 'images'> & {
  frames: Pick<ScoreFrame, 'pointsOne' | 'pointsTwo'>[]
  imageKeys: string[]
}

export interface ScoreImage {
  imageKey: string
  imageUrl: string
}

export interface ScoreGalleryEntry {
  id: number
  title: string
  playedAt: string
  note: string | null
  updatedAt: string
  images: ScoreImage[]
}

export interface ScoreGalleryInput {
  title: string
  playedAt: string
  note: string
  imageKeys: string[]
}

export interface ScorePage {
  items: ScoreRecord[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}
