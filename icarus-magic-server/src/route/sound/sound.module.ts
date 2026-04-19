import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SoundService } from './sound.service';
import { SoundController } from './sound.controller';
import { Sound } from './sound.entity';
import { ProjectSound } from './project-sound.entity';
import { Voice } from '../voice/voice.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Sound, ProjectSound, Voice])],
    controllers: [SoundController],
    providers: [SoundService],
})
export class SoundModule { }