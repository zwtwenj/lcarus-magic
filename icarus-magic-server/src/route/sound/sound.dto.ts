import { IsNumber, IsString, IsOptional, IsBoolean } from 'class-validator';

export interface VoiceParameters {
  volume?: number;
  rate?: number;
  pitch?: number;
  role?: string;
  emotion?: string;
}

export class GenerateSoundDto {
  @IsString()
  voiceId: string;

  @IsOptional()
  parameters?: VoiceParameters;

  @IsString()
  text: string;

  @IsNumber()
  projectId: number;

  @IsOptional()
  @IsString()
  voiceUrl?: string;
}

export class GenerateSoundResponse {
  url: string;
  id: number;
}