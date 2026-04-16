import { request } from './index'

// 文案润色请求参数接口
export interface PolishTextParams {
  originalText: string;
  styleType: string;
  polishIntensity: number;
}

// 文案润色 API
export const polishText = async (params: PolishTextParams): Promise<string> => {
  const response = await request.post<string>('/coze/polish', params) as unknown as string;
  return response;
};