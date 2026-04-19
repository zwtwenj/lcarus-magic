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
