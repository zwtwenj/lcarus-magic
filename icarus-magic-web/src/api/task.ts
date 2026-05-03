import { request } from './index';

export interface TaskStatusResponse {
  status: string;
  res: any;
}

export interface GetTaskStatusRequest {
  id: number;
}

export const getTaskStatus = async (id: number): Promise<TaskStatusResponse> => {
  const response = await request.post<GetTaskStatusRequest, TaskStatusResponse>('/task/status', { id });
  return response as unknown as TaskStatusResponse;
};

export interface Task {
  id: number;
  title: string;
  status: 'processing' | 'completed' | 'failed';
  type: string;
  create_time: string;
  parentid: number | null;
  req?: string;
  res?: string;
}

export interface GetTaskListRequest {
  page?: number;
  page_size?: number;
  title?: string;
  type?: string;
  status?: 'processing' | 'completed' | 'failed';
}

export interface GetTaskListResponse {
  list: Task[];
  total: number;
  page: number;
  page_size: number;
}

export const getTaskList = async (params: GetTaskListRequest): Promise<GetTaskListResponse> => {
  const response = await request.post<GetTaskListRequest, GetTaskListResponse>('/task/list', params);
  return response as unknown as GetTaskListResponse;
};
