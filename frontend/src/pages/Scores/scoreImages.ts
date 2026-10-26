import type { ScoreImage, ScoreRecord } from '../../types/scores'

export const scoreImages = (record: ScoreRecord): ScoreImage[] => {
  if (record.images?.length) return record.images
  if (record.imageKey && record.imageUrl) {
    return [{ imageKey: record.imageKey, imageUrl: record.imageUrl }]
  }
  return []
}
