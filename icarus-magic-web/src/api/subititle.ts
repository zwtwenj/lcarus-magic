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

export interface Subtitle {
  id: number
  projectId: number
  type: string | null
  url: string
  createdAt: string
}

export interface UploadSubtitleResponse {
  success: boolean
  subtitle: Subtitle
}

export const saveSubtitleConfig = async (name: string, config: string): Promise<SaveSubtitleResponse> => {
  const response = await request.post<SaveSubtitleResponse>('/subtitle-config/save', { name, config }) as unknown as SaveSubtitleResponse
  return response
}

export const getSubtitleList = async (): Promise<SubtitleConfig[]> => {
  const response = await request.post<SubtitleConfig[]>('/subtitle-config/list') as unknown as SubtitleConfig[]
  return response
}

export const deleteSubtitleConfig = async (id: number): Promise<void> => {
  await request.post('/subtitle-config/delete', { id })
}

export interface SubtitleListResponse {
  success: boolean
  list: Subtitle[]
}

export const uploadSubtitle = async (file: File, projectId: number): Promise<UploadSubtitleResponse> => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('projectId', projectId.toString())
  
  const response = await request.post<UploadSubtitleResponse>('/subtitle/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }) as unknown as UploadSubtitleResponse
  return response
}

export const getCustomSubtitleList = async (projectId: number): Promise<Subtitle[]> => {
  const response = await request.get<SubtitleListResponse>('/subtitle/list', { params: { projectId } }) as unknown as SubtitleListResponse
  return response.list
}