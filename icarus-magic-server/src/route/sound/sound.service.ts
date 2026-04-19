import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sound } from './sound.entity';
import { ProjectSound } from './project-sound.entity';
import { Voice } from '../voice/voice.entity';
import { ConfigService } from '@nestjs/config';
import OSSClient from '../../lib/oss';
import { SpeechSynthesizer, synthesizeSpeech } from '../../model/cosyvoice';
import { TaskService } from '../task/task.service';
import { TaskStatus } from '../task/task.dto';

@Injectable()
export class SoundService {
  private ossClient: OSSClient;

  constructor(
    private configService: ConfigService,
    @InjectRepository(Sound)
    private readonly soundRepository: Repository<Sound>,
    @InjectRepository(ProjectSound)
    private readonly projectSoundRepository: Repository<ProjectSound>,
    @InjectRepository(Voice)
    private readonly voiceRepository: Repository<Voice>,
    private taskService: TaskService,
  ) {
    this.ossClient = new OSSClient(configService);
  }

  async getSoundsByProjectId(projectId: number): Promise<any[]> {
    const projectSound = await this.projectSoundRepository.findOne({
      where: { projectId },
    });

    if (!projectSound || !projectSound.soundIds || projectSound.soundIds.length === 0) {
      return [];
    }

    const sounds = await this.soundRepository.find({
      where: projectSound.soundIds.map(id => ({ id })),
      relations: ['voice'],
    });

    const soundMap = new Map(sounds.map(s => [s.id, s]));
    const result: any[] = [];

    projectSound.soundIds.forEach((soundId) => {
      const sound = soundMap.get(soundId);
      if (sound) {
        result.push({
          id: sound.id,
          text: sound.text,
          url: sound.url,
          voiceId: sound.voiceId,
          voice: sound.voice,
        });
      }
    });

    return result;
  }

  // 语音合成
  async generateSound({ voiceId, parameters, text, projectId, voiceUrl, userId }: { voiceId: string, parameters: any, text: string, projectId: number, voiceUrl?: string, userId: string }): Promise<{ taskId: number }> {
    // 创建任务
    const task = await this.taskService.createTask(
      '语音合成',
      'sound',
      userId,
      {
        voiceId,
        parameters,
        text,
        projectId,
        voiceUrl
      }
    );

    // 异步执行语音合成和保存操作
    this.executeSpeechSynthesis(task.id, voiceId, parameters, text, projectId, voiceUrl);

    // 立即返回任务ID
    return {
      taskId: task.id
    };
  }

  /**
   * 异步执行语音合成并更新任务状态
   */
  private async executeSpeechSynthesis(
    taskId: number,
    voiceId: string,
    parameters: any,
    text: string,
    projectId: number,
    voiceUrl?: string
  ) {
    try {
      // 调用 synthesizeSpeech 函数
      const result = await synthesizeSpeech(
        this.configService,
        text,
        {
          voiceId,
          url: voiceUrl,
          parameters
        }
      );

      // 上传到 OSS
      const ossFileName = `/sound/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.mp3`;
      const ossUrl = await this.ossClient.uploadBufferAndGetUrl(result.audio, ossFileName);
      
      if (!ossUrl) {
        throw new Error('上传到 OSS 失败');
      }
      
      // 查找对应的 Voice 记录
      const voice = await this.voiceRepository.findOne({
        where: { voiceId } // 这里的 voiceId 是百炼平台的音声 ID
      });
      
      if (!voice) {
        throw new NotFoundException(`Voice with voiceId ${voiceId} not found`);
      }
      
      // 保存到 sound 表
      const sound = this.soundRepository.create({
        text,
        url: ossUrl,
        voiceId: voice.id, // 这里使用 Voice 表的 id 作为外键
        projectId,
        isTest: true
      });
      
      const savedSound = await this.soundRepository.save(sound);
      
      // 更新任务状态为 completed
      await this.taskService.updateTaskStatus(taskId, TaskStatus.completed, {
        url: ossUrl,
        id: savedSound.id
      });
    } catch (error) {
      // 更新任务状态为 failed，但包含错误信息
      await this.taskService.updateTaskStatus(taskId, TaskStatus.failed, {
        error: error.message || 'Unknown error'
      });
    }
  }

  // 项目语音合成
  async generateProjectSounds({ voiceId, parameters, text, projectId, voiceUrl, userId }: { voiceId: string, parameters: any, text: string[], projectId: number, voiceUrl?: string, userId: string }): Promise<{ taskId: number }> {
    // 创建父任务
    const parentTask = await this.taskService.createTask(
      '项目语音合成',
      'projectSounds',
      userId,
      {
        voiceId,
        parameters,
        text,
        projectId,
        voiceUrl
      }
    );

    // 延时队列：控制并发数量，避免速率限制
    const delay = 2000; // 每个任务间隔2秒
    const childTaskIds: number[] = [];
    
    for (let i = 0; i < text.length; i++) {
      const item = text[i];
      const childTask = await this.taskService.createTask(
        '语音合成',
        'sound',
        userId,
        {
          voiceId,
          parameters,
          text: item,
          projectId,
          voiceUrl
        },
        parentTask.id
      );

      childTaskIds.push(childTask.id);

      // 异步执行语音合成和保存操作
      this.executeSpeechSynthesis(childTask.id, voiceId, parameters, item, projectId, voiceUrl);

      // 如果不是最后一个任务，等待一段时间后再执行下一个
      if (i < text.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // 将子任务ID数组保存到父任务的res中
    await this.taskService.updateTaskStatus(
      parentTask.id, 
      TaskStatus.processing, 
      childTaskIds
    );

    // 立即返回父任务ID
    return {
      taskId: parentTask.id
    };
  }
}