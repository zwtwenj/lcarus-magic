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

// 查询项目列表请求参数接口
export interface ListProjectsParams {
  page?: number;
  page_size?: number;
  userId?: string;
}

// 项目列表项接口
export interface ProjectItem {
  id: number;
  name: string;
  description: string;
  status: string;
  createdAt: string;
}

// 查询项目列表响应接口
export interface ListProjectsResponse {
  list: ProjectItem[];
  total: number;
  page: number;
  page_size: number;
}

// 查询项目列表
export const listProjects = async (params: ListProjectsParams): Promise<ListProjectsResponse> => {
  const response = await request.post<ListProjectsResponse>('/project/list', params) as unknown as ListProjectsResponse;
  return response;
};