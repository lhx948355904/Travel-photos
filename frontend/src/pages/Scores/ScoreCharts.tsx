import type { ScoreRecord } from '../../types/scores'
import { averageFrameSwing } from './chartData'

const GRID = [0, 0.5, 1]

const ScoreCharts = ({ record }: { record: ScoreRecord }) => {
  const frames = record.frames || []
  if (!frames.length) return null

  const maximum = Math.max(20, ...frames.flatMap((frame) => [frame.pointsOne, frame.pointsTwo]))
  const width = Math.max(480, frames.length * 58 + 80)
  const plotLeft = 48
  const plotRight = width - 24
  const plotTop = 18
  const plotBottom = 174
  const x = (index: number) => frames.length === 1
    ? (plotLeft + plotRight) / 2
    : plotLeft + (index / (frames.length - 1)) * (plotRight - plotLeft)
  const y = (score: number) => plotBottom - (score / maximum) * (plotBottom - plotTop)
  const points = (key: 'pointsOne' | 'pointsTwo') =>
    frames.map((frame, index) => `${x(index)},${y(frame[key])}`).join(' ')
  const firstSwing = averageFrameSwing(frames, 'pointsOne')
  const secondSwing = averageFrameSwing(frames, 'pointsTwo')

  return <section className="score-analysis" aria-label={`${record.title} 逐局分析`}>
    <div className="score-analysis-head"><div><span>FRAME BY FRAME</span><h4>逐局分析</h4></div><span>{frames.length} 局实录</span></div>
    <div className="score-chart-legend"><span><i className="is-first" />{record.playerOne}</span><span><i className="is-second" />{record.playerTwo}</span></div>
    <div className="score-analysis-grid">
      <div className="score-chart-panel">
        <div className="score-chart-title"><h5>每局得分对比</h5><p>两位选手在每一局的实际得分</p></div>
        <div className="score-chart-scroll" tabIndex={0} aria-label="横向滚动查看所有局数">
          <div className="score-frame-bars" style={{ minWidth: `${Math.max(480, frames.length * 58)}px` }}>
            {frames.map((frame) => <div className="score-frame-column" key={frame.frameNumber}>
              <div className="score-frame-pair">
                <div className="score-frame-bar is-first" style={{ height: `${frame.pointsOne / maximum * 100}%` }} title={`${record.playerOne}：${frame.pointsOne} 分`}><span>{frame.pointsOne}</span></div>
                <div className="score-frame-bar is-second" style={{ height: `${frame.pointsTwo / maximum * 100}%` }} title={`${record.playerTwo}：${frame.pointsTwo} 分`}><span>{frame.pointsTwo}</span></div>
              </div>
              <span className="score-frame-label">第 {frame.frameNumber} 局</span>
            </div>)}
          </div>
        </div>
      </div>
      <div className="score-chart-panel">
        <div className="score-chart-title"><h5>个人得分走势</h5><p>曲线起伏可作为稳定性参考</p></div>
        <div className="score-chart-scroll" tabIndex={0} aria-label="横向滚动查看完整得分走势">
          <svg className="score-trend-chart" viewBox={`0 0 ${width} 220`} style={{ minWidth: `${width}px` }} role="img" aria-label={`${record.playerOne} 和 ${record.playerTwo} 的逐局得分曲线`}>
            {GRID.map((fraction) => <g key={fraction}>
              <line x1={plotLeft} x2={plotRight} y1={y(maximum * fraction)} y2={y(maximum * fraction)} className="score-trend-grid" />
              <text x={plotLeft - 9} y={y(maximum * fraction) + 4} textAnchor="end" className="score-trend-axis">{Math.round(maximum * fraction)}</text>
            </g>)}
            {frames.length > 1 && <><polyline points={points('pointsOne')} className="score-trend-line is-first" /><polyline points={points('pointsTwo')} className="score-trend-line is-second" /></>}
            {frames.map((frame, index) => <g key={frame.frameNumber}>
              <circle cx={x(index)} cy={y(frame.pointsOne)} r="4.5" className="score-trend-dot is-first" />
              <circle cx={x(index)} cy={y(frame.pointsTwo)} r="4.5" className="score-trend-dot is-second" />
              {(frames.length <= 10 || index % 5 === 0 || index === frames.length - 1) && <text x={x(index)} y={205} textAnchor="middle" className="score-trend-axis">{frame.frameNumber}</text>}
            </g>)}
          </svg>
        </div>
      </div>
    </div>
    <div className="score-stability"><strong>稳定性参考</strong><span>{frames.length < 2
      ? '记录至少两局后可计算得分波动。'
      : `${record.playerOne} 平均局间波动 ${firstSwing!.toFixed(1)} 分；${record.playerTwo} ${secondSwing!.toFixed(1)} 分。`}</span></div>
    <p className="score-analysis-note">波动 = 相邻两局得分差的绝对值平均数。数值越低，仅表示本场得分变化越小，不代表选手整体技术水平。</p>
    <table className="score-visually-hidden"><caption>{record.title} 的逐局原始得分</caption><thead><tr><th>局数</th><th>{record.playerOne}</th><th>{record.playerTwo}</th></tr></thead><tbody>{frames.map((frame) => <tr key={frame.frameNumber}><td>{frame.frameNumber}</td><td>{frame.pointsOne}</td><td>{frame.pointsTwo}</td></tr>)}</tbody></table>
  </section>
}

export default ScoreCharts
