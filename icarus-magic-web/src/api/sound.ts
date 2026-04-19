import { request } from './index';

export interface VoiceParameters {
  volume?: number;
  rate?: number;
  pitch?: number;
  role?: string;
  emotion?: string;
}

export interface GenerateSoundRequest {
  voiceId: string;
  parameters?: VoiceParameters;
  text: string;
  projectId: number;
  voiceUrl?: string;
}

export interface GenerateSoundResponse {
  url: string;
  id: number;
}

export const generateSound = async (data: GenerateSoundRequest): Promise<GenerateSoundResponse> => {
  const response = await request.post<GenerateSoundResponse>('/sound/generate', data);
  return response as unknown as GenerateSoundResponse;
};