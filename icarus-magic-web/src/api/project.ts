import { request } from './index'

// 创建项目请求参数接口
export interface CreateProjectParams {
  name: string;
  description: string;
  userId: string;
}

// 创建项目响应接口
export interface CreateProjectResponse {
  id: number;
  name: string;
  description: string;
  status: string;
}

// 创建项目
export const createProject = async (params: CreateProjectParams): Promise<CreateProjectResponse> => {
  const response = await request.post<CreateProjectResponse>('/project/create', params) as unknown as CreateProjectResponse;
  return response;
};