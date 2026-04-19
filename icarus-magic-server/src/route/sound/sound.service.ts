import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sound } from './sound.entity';
import { ProjectSound } from './project-sound.entity';
import { Voice } from '../voice/voice.entity';
import { ConfigService } from '@nestjs/config';
import OSSClient from '../../lib/oss';
import { SpeechSynthesizer, synthesizeSpeech } from '../../model/cosyvoice';

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
  async generateSound(voiceId: string, parameters: any, text: string, projectId: number, voiceUrl?: string): Promise<{ url: string; id: number }> {
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
    
    return {
      url: ossUrl,
      id: savedSound.id
    };
  }
}