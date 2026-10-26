import type { ScoreFrame } from '../../types/scores'

/** 相邻两局得分差的平均绝对值，越小仅表示得分变化越小。 */
export const averageFrameSwing = (frames: ScoreFrame[], player: 'pointsOne' | 'pointsTwo') => {
  if (frames.length < 2) return null
  const total = frames.slice(1).reduce((sum, frame, index) =>
    sum + Math.abs(frame[player] - frames[index][player]), 0)
  return total / (frames.length - 1)
}

export const frameWins = (frames: Pick<ScoreFrame, 'pointsOne' | 'pointsTwo'>[]) =>
  frames.reduce((total, frame) => ({
    one: total.one + Number(frame.pointsOne > frame.pointsTwo),
    two: total.two + Number(frame.pointsTwo > frame.pointsOne),
  }), { one: 0, two: 0 })
