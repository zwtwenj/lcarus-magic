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

export interface GenerateProjectSoundsRequest {
  voiceId: string;
  parameters?: VoiceParameters;
  text: string[];
  projectId: number;
  voiceUrl?: string;
}

export interface GenerateSoundResponse {
  taskId: number;
}

export const generateSound = async (data: GenerateSoundRequest): Promise<GenerateSoundResponse> => {
  const response = await request.post<GenerateSoundResponse>('/sound/generate/test', data);
  return response as unknown as GenerateSoundResponse;
};

export const generateProjectSounds = async (data: GenerateProjectSoundsRequest): Promise<GenerateSoundResponse> => {
  const response = await request.post<GenerateSoundResponse>('/sound/generate', data);
  return response as unknown as GenerateSoundResponse;
};