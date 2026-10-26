import { describe, expect, it } from 'vitest'
import type { ScoreRecord } from '../../types/scores'
import { scoreImages } from './scoreImages'

const record = (images?: ScoreRecord['images']): ScoreRecord => ({
  id: 1, title: '测试比赛', playerOne: '甲', playerTwo: '乙', scoreOne: 1, scoreTwo: 0,
  playedAt: '2026-10-26T12:00:00', venue: null, note: null,
  imageKey: 'legacy-key', imageUrl: '/legacy.jpg', images,
  updatedAt: '2026-10-26T12:00:00', frames: [],
})

describe('比赛照片兼容', () => {
  it('旧接口只有单图字段时仍能在图库显示', () => {
    expect(scoreImages(record())).toEqual([{ imageKey: 'legacy-key', imageUrl: '/legacy.jpg' }])
  })

  it('新版多图优先显示完整图片列表', () => {
    const images = [{ imageKey: 'a', imageUrl: '/a.jpg' }, { imageKey: 'b', imageUrl: '/b.jpg' }]
    expect(scoreImages(record(images))).toEqual(images)
  })
})
