import { describe, expect, it } from 'vitest'
import type { ScoreRecord } from '../../types/scores'
import { sortScoreRecordsByPlayedAt } from './scoreOrdering'

const record = (id: number, playedAt: string): ScoreRecord => ({
  id,
  title: `比赛 ${id}`,
  playerOne: '刘哥',
  playerTwo: '徐哥',
  scoreOne: 1,
  scoreTwo: 0,
  playedAt,
  venue: null,
  note: null,
  imageKey: null,
  imageUrl: null,
  images: [],
  updatedAt: playedAt,
  frames: [],
})

describe('sortScoreRecordsByPlayedAt', () => {
  it('按比赛时间从新到旧排列且不修改原数组', () => {
    const records = [
      record(1, '2026-10-11T15:00:00'),
      record(2, '2026-10-24T13:00:00'),
      record(3, '2026-10-18T13:00:00'),
    ]

    expect(sortScoreRecordsByPlayedAt(records).map(({ id }) => id)).toEqual([2, 3, 1])
    expect(records.map(({ id }) => id)).toEqual([1, 2, 3])
  })

  it('时间相同时让较新的记录排在前面', () => {
    const records = [
      record(4, '2026-10-24T13:00:00'),
      record(7, '2026-10-24T13:00:00'),
    ]

    expect(sortScoreRecordsByPlayedAt(records).map(({ id }) => id)).toEqual([7, 4])
  })

  it('跨年份时优先比较年份，再比较月日和时间', () => {
    const records = [
      record(8, '2025-12-21T13:00:00'),
      record(10, '2026-10-24T13:00:00'),
      record(9, '2026-01-02T09:00:00'),
    ]

    expect(sortScoreRecordsByPlayedAt(records).map(({ id }) => id)).toEqual([10, 9, 8])
  })
})
