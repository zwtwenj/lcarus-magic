import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sound } from './sound.entity';
import { Voice } from '../voice/voice.entity';
import { Project, Segment } from '../project/project.entity';
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
    @InjectRepository(Voice)
    private readonly voiceRepository: Repository<Voice>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private taskService: TaskService,
  ) {
    this.ossClient = new OSSClient(configService);
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
  async generateProjectSounds({ voiceId, parameters, segments, projectId, voiceUrl, userId }: { voiceId: string, parameters: any, segments: Segment[], projectId: number, voiceUrl?: string, userId: string }): Promise<{ taskId: number }> {
    // 创建父任务
    const parentTask = await this.taskService.createTask(
      '项目语音合成',
      'projectSounds',
      userId,
      {
        voiceId,
        parameters,
        segments,
        projectId,
        voiceUrl
      }
    );

    // 延时队列：控制并发数量，避免速率限制
    const delay = 2000; // 每个任务间隔2秒
    const childTaskIds: number[] = [];
    const segmentIndexMap = new Map<number, number>(); // taskId -> segment sort
    
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const childTask = await this.taskService.createTask(
        '语音合成',
        'sound',
        userId,
        {
          voiceId,
          parameters,
          text: segment.text,
          projectId,
          voiceUrl,
          segmentSort: segment.sort
        },
        parentTask.id
      );

      childTaskIds.push(childTask.id);
      segmentIndexMap.set(childTask.id, segment.sort);

      // 异步执行语音合成和保存操作
      this.executeSpeechSynthesisForSegment(childTask.id, voiceId, parameters, segment, projectId, voiceUrl);

      // 如果不是最后一个任务，等待一段时间后再执行下一个
      if (i < segments.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // 将子任务ID数组保存到父任务的res中
    await this.taskService.updateTaskStatus(
      parentTask.id, 
      TaskStatus.processing, 
      childTaskIds
    );

    // 监听所有子任务完成，然后更新项目的 segments
    this.monitorChildTasksCompletion(parentTask.id, projectId, voiceId, parameters, segments, childTaskIds, segmentIndexMap);

    // 立即返回父任务ID
    return {
      taskId: parentTask.id
    };
  }

  /**
   * 异步执行语音合成并更新任务状态（用于段落）
   */
  private async executeSpeechSynthesisForSegment(
    taskId: number,
    voiceId: string,
    parameters: any,
    segment: Segment,
    projectId: number,
    voiceUrl?: string
  ) {
    try {
      // 调用 synthesizeSpeech 函数
      const result = await synthesizeSpeech(
        this.configService,
        segment.text,
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
        where: { voiceId }
      });
      
      if (!voice) {
        throw new NotFoundException(`Voice with voiceId ${voiceId} not found`);
      }
      
      // 保存到 sound 表
      const sound = this.soundRepository.create({
        text: segment.text,
        url: ossUrl,
        voiceId: voice.id,
        projectId,
        isTest: false
      });
      
      const savedSound = await this.soundRepository.save(sound);
      
      // 更新任务状态为 completed
      await this.taskService.updateTaskStatus(taskId, TaskStatus.completed, {
        url: ossUrl,
        id: savedSound.id,
        segmentSort: segment.sort
      });
    } catch (error) {
      // 更新任务状态为 failed
      await this.taskService.updateTaskStatus(taskId, TaskStatus.failed, {
        error: error.message || 'Unknown error',
        segmentSort: segment.sort
      });
    }
  }

  /**
   * 监听所有子任务完成，然后更新项目的 segments
   */
  private async monitorChildTasksCompletion(
    parentTaskId: number,
    projectId: number,
    voiceId: string,
    parameters: any,
    originalSegments: Segment[],
    childTaskIds: number[],
    segmentIndexMap: Map<number, number>
  ) {
    const checkInterval = 2000; // 每2秒检查一次
    const maxAttempts = 600; // 最多检查20分钟
    let attempts = 0;

    const checkCompletion = async () => {
      try {
        // 查询所有子任务的状态
        const tasks = await Promise.all(
          childTaskIds.map(id => this.taskService.getTaskById(id))
        );

        const allCompleted = tasks.every(task => 
          task && (task.status === 'completed' || task.status === 'failed')
        );

        if (allCompleted) {
          // 更新项目的 segments
          const updatedSegments = originalSegments.map(segment => {
            const childTask = tasks.find(task => {
              if (!task) return false;
              const taskRes = typeof task.res === 'string' ? JSON.parse(task.res) : task.res;
              return taskRes?.segmentSort === segment.sort;
            });

            if (childTask && childTask.status === 'completed') {
              const taskRes = typeof childTask.res === 'string' ? JSON.parse(childTask.res) : childTask.res;
              return {
                ...segment,
                sound: taskRes?.url || null
              };
            }

            return segment;
          });

          // 更新项目的 segments 字段
          const project = await this.projectRepository.findOne({
            where: { id: projectId }
          });

          if (project) {
            project.segments = updatedSegments;
            // 保存 voiceId 和 parameters 到项目
            project.voiceId = voiceId;
            project.parameters = parameters;
            await this.projectRepository.save(project);
          }

          // 更新父任务状态为 completed，res 中保存 segments 数组
          await this.taskService.updateTaskStatus(
            parentTaskId,
            TaskStatus.completed,
            updatedSegments
          );
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(checkCompletion, checkInterval);
        } else {
          // 超时，更新父任务状态为 failed
          await this.taskService.updateTaskStatus(
            parentTaskId,
            TaskStatus.failed,
            { error: '任务超时' }
          );
        }
      } catch (error) {
        console.error('检查子任务完成状态失败:', error);
        if (attempts < maxAttempts) {
          attempts++;
          setTimeout(checkCompletion, checkInterval);
        }
      }
    };

    checkCompletion();
  }
}