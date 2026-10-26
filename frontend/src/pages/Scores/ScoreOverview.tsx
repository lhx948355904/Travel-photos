import { useEffect, useRef, useState } from 'react'
import type { ScoreRecord } from '../../types/scores'
import { collectMatchups, matchTrend, playerRecord } from './overviewData'

const GRID = [0, 0.5, 1]

function WinRate({ name, records, second = false }: { name: string; records: ScoreRecord[]; second?: boolean }) {
  const { matches, wins, rate } = playerRecord(records, name)
  return <div className={`score-overview-player ${second ? 'is-second' : ''}`}>
    <div className="score-overview-donut" role="img" aria-label={`${name}：${matches} 场比赛，${wins} 胜，胜率 ${rate}%`}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle className="score-overview-donut-track" cx="60" cy="60" r="47" />
        <circle className="score-overview-donut-value" cx="60" cy="60" r="47" pathLength="100" strokeDasharray={`${rate} ${100 - rate}`} />
      </svg>
      <strong>{rate}%</strong>
    </div>
    <div><h4>{name}</h4><p>{wins} 胜 / {matches} 场</p></div>
  </div>
}

export default function ScoreOverview({ records }: { records: ScoreRecord[] }) {
  const [selectedKey, setSelectedKey] = useState('')
  const [availableWidth, setAvailableWidth] = useState(620)
  const chartContainer = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const container = chartContainer.current
    if (!container) return
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width)
      setAvailableWidth((current) => current === width ? current : width)
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])
  const matchups = collectMatchups(records)
  const selected = matchups.find((matchup) => matchup.key === selectedKey) || matchups[0]
  if (!selected) return null

  const trend = matchTrend(selected)
  const width = Math.max(availableWidth, trend.length * 96 + 100)
  const left = 52
  const right = width - 32
  const top = 22
  const bottom = 186
  const maximum = Math.max(2, ...trend.flatMap((point) => [point.first, point.second]))
  const x = (index: number) => trend.length === 1 ? (left + right) / 2 : left + index / (trend.length - 1) * (right - left)
  const y = (score: number) => bottom - score / maximum * (bottom - top)
  const line = (player: 'first' | 'second') => trend.map((point, index) => `${x(index)},${y(point[player])}`).join(' ')

  return <section className="score-overview" aria-labelledby="score-overview-heading">
    <div className="score-overview-heading">
      <div><span>比赛数据</span><h2 id="score-overview-heading">对阵走势</h2><p>按比赛日期查看双方胜局数，胜率统计使用全部已记录比赛。</p></div>
      {matchups.length > 1 && <label>选择对阵
        <select value={selected.key} onChange={(event) => setSelectedKey(event.target.value)}>
          {matchups.map((matchup) => <option key={matchup.key} value={matchup.key}>{matchup.first} · {matchup.second}</option>)}
        </select>
      </label>}
    </div>
    <div className="score-overview-grid">
      <div className="score-overview-trend">
        <div className="score-overview-panel-heading"><h3>每场胜局趋势</h3><span>{selected.records.length} 场交手</span></div>
        <div className="score-chart-legend"><span><i />{selected.first}</span><span><i className="is-second" />{selected.second}</span></div>
        <div ref={chartContainer} className="score-chart-scroll" tabIndex={0} aria-label="横向滚动查看比赛日期走势">
          <svg className="score-overview-line-chart" viewBox={`0 0 ${width} 242`} style={{ minWidth: `${width}px` }} role="img" aria-label={`${selected.first} 和 ${selected.second} 按比赛日期的胜局趋势`}>
            {GRID.map((fraction) => <g key={fraction}>
              <line className="score-trend-grid" x1={left} x2={right} y1={y(maximum * fraction)} y2={y(maximum * fraction)} />
              <text className="score-trend-axis" x={left - 12} y={y(maximum * fraction) + 4} textAnchor="end">{Math.round(maximum * fraction)}</text>
            </g>)}
            {trend.length > 1 && <><polyline className="score-trend-line" points={line('first')} /><polyline className="score-trend-line is-second" points={line('second')} /></>}
            {trend.map((point, index) => <g key={point.id}>
              <circle className="score-trend-dot" cx={x(index)} cy={y(point.first)} r="5"><title>{point.date} {selected.first} {point.first} 局</title></circle>
              <circle className="score-trend-dot is-second" cx={x(index)} cy={y(point.second)} r="5"><title>{point.date} {selected.second} {point.second} 局</title></circle>
              <text className="score-trend-axis" x={x(index)} y="220" textAnchor="middle">{point.date.slice(5).replace('-', '/')}</text>
            </g>)}
          </svg>
        </div>
        {trend.length < 2 && <p className="score-overview-hint">目前只有一场交手，记录第二场后即可看到趋势。</p>}
      </div>
      <div className="score-overview-rates">
        <div className="score-overview-panel-heading"><h3>个人胜率</h3><span>全部比赛记录</span></div>
        <WinRate name={selected.first} records={records} />
        <WinRate name={selected.second} records={records} second />
        <p className="score-overview-hint">胜率 = 胜场 ÷ 已记录场数；平局计入场数，不计胜场。仅反映本站记录。</p>
      </div>
    </div>
    <table className="score-visually-hidden"><caption>{selected.first} 与 {selected.second} 历次对阵胜局</caption><thead><tr><th>日期</th><th>{selected.first}</th><th>{selected.second}</th></tr></thead><tbody>{trend.map((point) => <tr key={point.id}><td>{point.date}</td><td>{point.first}</td><td>{point.second}</td></tr>)}</tbody></table>
  </section>
}
