import { describe, expect, it } from 'vitest'
import { averageFrameSwing, frameWins } from './chartData'

describe('逐局分析', () => {
  const frames = [
    { frameNumber: 1, pointsOne: 75, pointsTwo: 42 },
    { frameNumber: 2, pointsOne: 31, pointsTwo: 69 },
    { frameNumber: 3, pointsOne: 81, pointsTwo: 13 },
  ]

  it('只用真实逐局得分计算胜局和波动', () => {
    expect(frameWins(frames)).toEqual({ one: 2, two: 1 })
    expect(averageFrameSwing(frames, 'pointsOne')).toBe(47)
    expect(averageFrameSwing(frames, 'pointsTwo')).toBe(41.5)
  })

  it('数据不足两局时不生成稳定性数值', () => {
    expect(averageFrameSwing([], 'pointsOne')).toBeNull()
    expect(averageFrameSwing(frames.slice(0, 1), 'pointsTwo')).toBeNull()
  })
})
