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

// 查询项目信息响应接口
export interface GetProjectInfoResponse {
  id: number;
  name: string;
  description: string;
  status: string;
  text: string;
  createdAt: string;
}

// 查询项目信息
export const getProjectInfo = async (id: number): Promise<GetProjectInfoResponse> => {
  const response = await request.get<GetProjectInfoResponse>(`/project/info?id=${id}`) as unknown as GetProjectInfoResponse;
  return response;
};

// 保存项目文案请求参数接口
export interface SaveTextParams {
  projectId: number;
  text: string;
}

// 保存项目文案
export const saveText = async (params: SaveTextParams): Promise<GetProjectInfoResponse> => {
  const response = await request.post<GetProjectInfoResponse>('/project/saveText', params) as unknown as GetProjectInfoResponse;
  return response;
};

// 一键成片请求参数接口
export interface OneClickGenerateParams {
  projectId: string;
  materials: string[];
}

// 一键成片响应接口
export interface OneClickGenerateResponse {
  projectId: string;
  materials: string[];
  message: string;
}

// 一键成片
export const oneClickGenerate = async (params: OneClickGenerateParams): Promise<OneClickGenerateResponse> => {
  const response = await request.post<OneClickGenerateResponse>('/project/generate', params) as unknown as OneClickGenerateResponse;
  return response;
};