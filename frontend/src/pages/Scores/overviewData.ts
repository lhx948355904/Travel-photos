import type { ScoreRecord } from '../../types/scores'

export interface Matchup {
  key: string
  first: string
  second: string
  records: ScoreRecord[]
}

const playerKey = (name: string) => name.trim().toLocaleLowerCase()

export const collectMatchups = (records: ScoreRecord[]): Matchup[] => {
  const matchups = new Map<string, Matchup>()
  for (const record of records) {
    if (playerKey(record.playerOne) === playerKey(record.playerTwo)) continue
    const key = [playerKey(record.playerOne), playerKey(record.playerTwo)].sort().join('\u0000')
    const matchup = matchups.get(key)
    if (matchup) matchup.records.push(record)
    else matchups.set(key, { key, first: record.playerOne, second: record.playerTwo, records: [record] })
  }
  return [...matchups.values()]
    .map((matchup) => ({ ...matchup, records: [...matchup.records].sort((a, b) =>
      a.playedAt.localeCompare(b.playedAt) || a.id - b.id) }))
    .sort((a, b) => b.records[b.records.length - 1].playedAt.localeCompare(a.records[a.records.length - 1].playedAt))
}

export const matchTrend = (matchup: Matchup) => matchup.records.map((record) => {
  const sameOrder = playerKey(record.playerOne) === playerKey(matchup.first)
  return {
    id: record.id,
    date: record.playedAt.slice(0, 10),
    first: sameOrder ? record.scoreOne : record.scoreTwo,
    second: sameOrder ? record.scoreTwo : record.scoreOne,
  }
})

export const playerRecord = (records: ScoreRecord[], name: string) => {
  const key = playerKey(name)
  let matches = 0
  let wins = 0
  for (const record of records) {
    const first = playerKey(record.playerOne) === key
    const second = playerKey(record.playerTwo) === key
    if (first === second) continue
    matches++
    if ((first && record.scoreOne > record.scoreTwo) || (second && record.scoreTwo > record.scoreOne)) wins++
  }
  return { matches, wins, rate: matches ? Math.round(wins / matches * 100) : 0 }
}
