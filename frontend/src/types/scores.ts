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
  updatedAt: string
  frames: ScoreFrame[]
}

export type ScoreInput = Omit<ScoreRecord, 'id' | 'imageUrl' | 'updatedAt' | 'frames'> & {
  frames: Pick<ScoreFrame, 'pointsOne' | 'pointsTwo'>[]
}

export interface ScorePage {
  items: ScoreRecord[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}
