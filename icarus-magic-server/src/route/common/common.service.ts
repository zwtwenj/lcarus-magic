import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OSSClient from '../../lib/oss';
import { synthesizeSpeech } from '../../model/cosyvoice';

interface UploadFile {
  originalname: string;
  buffer: Buffer;
}

@Injectable()
export class CommonService {
  private ossClient: OSSClient;

  constructor(private configService: ConfigService) {
    this.ossClient = new OSSClient(configService);
  }

  async uploadMaterial(file: UploadFile): Promise<string | undefined> {
    const ossFileName = `/material/${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${file.originalname}`;
    return await this.ossClient.uploadBufferAndGetUrl(file.buffer, ossFileName);
  }

  async uploadSound(file: UploadFile): Promise<string | undefined> {
    const ossFileName = `/sound/${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${file.originalname}`;
    return await this.ossClient.uploadBufferAndGetUrl(file.buffer, ossFileName);
  }

  async testCosyvoice(text: string, voiceId?: string, url?: string, parameters?: Record<string, any>): Promise<{ data?: any; error?: string }> {
    try {
      // 调用 synthesizeSpeech 函数
      const result = await synthesizeSpeech(
        this.configService,
        text,
        {
          voiceId,
          url,
          parameters
        }
      );

      // 上传到 OSS
      const ext = '.mp3';
      const synthFilename = `synth-${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`;
      const ossObjectKey = `sound/${synthFilename}`;
      const ossUrl = await this.ossClient.uploadBufferAndGetUrl(result.audio, ossObjectKey);

      // 构建返回数据
      const data = {
        text,
        voiceId: result.voiceId,
        ossUrl: ossUrl || undefined,
        format: result.format || 'mp3'
      };

      return {
        data
      };
    } catch (error) {
      return {
        error: error.message || 'Unknown error'
      };
    }
  }
}