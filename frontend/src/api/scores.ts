import request from './request'
import type { ScoreInput, ScorePage, ScoreRecord } from '../types/scores'

export const getScores = (params: { page: number; pageSize: number; q?: string; month?: string }) =>
  request.get<never, ScorePage>('/scores', { params })

export const createScore = (input: ScoreInput) =>
  request.post<never, ScoreRecord>('/admin/scores', input)

export const updateScore = (id: number, input: ScoreInput) =>
  request.put<never, ScoreRecord>(`/admin/scores/${id}`, input)

export const deleteScore = (id: number) =>
  request.delete<never, void>(`/admin/scores/${id}`)

export const uploadScoreImage = (file: File) => {
  const data = new FormData()
  data.append('file', file)
  return request.post<never, { cosKey: string; url: string }>('/admin/scores/image', data)
}
