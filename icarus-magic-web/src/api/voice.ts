import { request } from './index'

export interface VoiceItem {
  id: number
  name: string
  url: string
  isDefault: boolean
  userId: number | null
  createdAt: string
}

export const getVoiceList = async (): Promise<VoiceItem[]> => {
  const response = await request.post<VoiceItem[]>('/voice/list') as unknown as VoiceItem[]
  return response
}