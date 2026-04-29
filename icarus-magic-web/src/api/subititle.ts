import { request } from './index'

export interface SubtitleConfig {
  id: number
  name: string
  config: string
  assStr: string
  userId: number
  createdAt: string
}

export interface SaveSubtitleResponse {
  id: number
  name: string
  userId: number
  config: string
}

export const saveSubtitleConfig = async (name: string, config: string): Promise<SaveSubtitleResponse> => {
  const response = await request.post<SaveSubtitleResponse>('/subtitle-config/save', { name, config }) as unknown as SaveSubtitleResponse
  return response
}

export const getSubtitleList = async (): Promise<SubtitleConfig[]> => {
  const response = await request.post<SubtitleConfig[]>('/subtitle-config/list') as unknown as SubtitleConfig[]
  return response
}