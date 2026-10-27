import type { ScoreRecord } from '../../types/scores'

const playedAtValue = (record: ScoreRecord) => {
  const timestamp = Date.parse(record.playedAt)
  return Number.isNaN(timestamp) ? 0 : timestamp
}

export const sortScoreRecordsByPlayedAt = (records: ScoreRecord[]) =>
  [...records].sort((first, second) => {
    const timeDifference = playedAtValue(second) - playedAtValue(first)
    return timeDifference || second.id - first.id
  })
