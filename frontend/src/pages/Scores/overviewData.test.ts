import { describe, expect, it } from 'vitest'
import type { ScoreRecord } from '../../types/scores'
import { collectMatchups, matchTrend, playerRecord } from './overviewData'

const match = (id: number, playerOne: string, playerTwo: string, scoreOne: number, scoreTwo: number, date: string): ScoreRecord => ({
  id, title: `比赛 ${id}`, playerOne, playerTwo, scoreOne, scoreTwo, playedAt: `${date}T18:00:00`,
  venue: null, note: null, imageKey: null, imageUrl: null, images: [], updatedAt: `${date}T18:00:00`, frames: [],
})

describe('比赛统计', () => {
  const records = [
    match(3, '徐哥', '刘哥', 2, 4, '2026-10-26'),
    match(2, '刘哥', '小王', 1, 2, '2026-10-25'),
    match(1, '刘哥', '徐哥', 3, 3, '2026-10-24'),
  ]

  it('同一对阵交换选手位置后仍归为一组，并按日期排列胜局', () => {
    const matchup = collectMatchups(records)[0]
    expect(matchup.records).toHaveLength(2)
    expect(matchTrend(matchup)).toEqual([
      { id: 1, date: '2026-10-24', first: 3, second: 3 },
      { id: 3, date: '2026-10-26', first: 2, second: 4 },
    ])
  })

  it('个人胜率使用所有对手的比赛，平局计入场数', () => {
    expect(playerRecord(records, '刘哥')).toEqual({ matches: 3, wins: 1, rate: 33 })
    expect(playerRecord(records, '徐哥')).toEqual({ matches: 2, wins: 0, rate: 0 })
  })
})
