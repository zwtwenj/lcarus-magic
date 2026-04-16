import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sound } from './sound.entity';
import { ProjectSound } from './project-sound.entity';

@Injectable()
export class SoundService {
  constructor(
    @InjectRepository(Sound)
    private readonly soundRepository: Repository<Sound>,
    @InjectRepository(ProjectSound)
    private readonly projectSoundRepository: Repository<ProjectSound>,
  ) {}

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
}
