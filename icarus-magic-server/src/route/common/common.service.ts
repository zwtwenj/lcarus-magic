import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OSSClient from '../../lib/oss';
import { synthesizeSpeech } from '../../model/cosyvoice';
import { TaskService } from '../task/task.service';
import { TaskStatus } from '../task/task.dto';

interface UploadFile {
  originalname: string;
  buffer: Buffer;
}

@Injectable()
export class CommonService {
  private ossClient: OSSClient;

  constructor(private configService: ConfigService, private taskService: TaskService) {
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

  async testCosyvoice({ userId, text, voiceId, url, parameters }: { userId: string, text: string, voiceId?: string, url?: string, parameters?: Record<string, any> }): Promise<{ taskId?: number; error?: string }> {
    try {
      // 创建任务
      const task = await this.taskService.createTask(
        '语音合成测试',
        'sound',
        userId,
        {
          text,
          voiceId,
          url,
          parameters
        }
      );

      // 异步执行语音合成并更新任务状态
      this.executeSpeechSynthesis(task.id, text, voiceId, url, parameters);

      // 立即返回任务ID
      return {
        taskId: task.id
      };
    } catch (error) {
      return {
        error: error.message || 'Unknown error'
      };
    }
  }

  /**
   * 异步执行语音合成并更新任务状态
   */
  private async executeSpeechSynthesis(
    taskId: number,
    text: string,
    voiceId?: string,
    url?: string,
    parameters?: Record<string, any>
  ) {
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

      // 更新任务状态为 completed
      await this.taskService.updateTaskStatus(taskId, TaskStatus.completed, data);
    } catch (error) {
      // 更新任务状态为 completed，但包含错误信息
      await this.taskService.updateTaskStatus(taskId, TaskStatus.completed, {
        error: error.message || 'Unknown error'
      });
    }
  }
}