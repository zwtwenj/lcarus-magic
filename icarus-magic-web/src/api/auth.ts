import { request } from './index'

// 登录请求参数接口
export interface LoginParams {
  username: string;
  password: string;
}

// 登录响应接口
export interface LoginResponse {
  user: {
    id: number;
    username: string;
    // 其他用户字段
  };
  access_token: string;
}

// 登录 API
export const login = async (params: LoginParams): Promise<LoginResponse> => {
  const response = await request.post<LoginResponse>('/auth/login', params) as unknown as LoginResponse;
  return response;
};


