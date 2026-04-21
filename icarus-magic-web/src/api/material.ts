import { request } from './index'

export interface Material {
  id: number
  type: 'image' | 'video' | 'voice'
  name: string
  url: string
  projectId: number
  userId: number
  createdAt: Date
  tags?: string[]
  fileSize?: string
  project: { id: number; name: string }
}

export interface AddMaterialParams {
  projectId: string
  file: File
}

export interface GetMaterialsParams {
  projectId: string
  type?: 'image' | 'video' | 'voice'
  keyword?: string
}

export interface GetMaterialDetailParams {
  materialId: string
}

export interface DeleteMaterialParams {
  projectId: string
  materialId: string
}

export interface RenameMaterialParams {
  projectId: string
  materialId: string
  newName: string
}

export interface TagMaterialParams {
  projectId: string
  materialId: string
}

export interface UpdateMaterialTagsParams {
  projectId: string
  materialId: string
  tags: string[]
}

export const addMaterial = async (params: AddMaterialParams): Promise<Material> => {
  const formData = new FormData()
  formData.append('projectId', params.projectId)
  formData.append('file', params.file)

  const response = await request.post<Material>('/material/add', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response as unknown as Material
}

export const getMaterials = async (params: GetMaterialsParams): Promise<Material[]> => {
  const response = await request.post<Material[]>('/material/list', params)
  return response as unknown as Material[]
}

export const getMaterialDetail = async (params: GetMaterialDetailParams): Promise<Material> => {
  const response = await request.post<Material>('/material/detail', params)
  return response as unknown as Material
}

export const deleteMaterial = async (params: DeleteMaterialParams): Promise<void> => {
  await request.post('/material/delete', params)
}

export const renameMaterial = async (params: RenameMaterialParams): Promise<Material> => {
  const response = await request.post<Material>('/material/rename', params)
  return response as unknown as Material
}

export const tagMaterial = async (params: TagMaterialParams): Promise<Material> => {
  const response = await request.post<Material>('/material/tag', params)
  return response as unknown as Material
}

export const updateMaterialTags = async (params: UpdateMaterialTagsParams): Promise<Material> => {
  const response = await request.post<Material>('/material/updateTags', params)
  return response as unknown as Material
}
