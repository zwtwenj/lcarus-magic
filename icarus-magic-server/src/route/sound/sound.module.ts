import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SoundService } from './sound.service';
import { SoundController } from './sound.controller';
import { Sound } from './sound.entity';
import { ProjectSound } from './project-sound.entity';
import { Voice } from '../voice/voice.entity';
import { TaskModule } from '../task/task.module';

@Module({
    imports: [TypeOrmModule.forFeature([Sound, ProjectSound, Voice]), TaskModule],
    controllers: [SoundController],
    providers: [SoundService],
})
export class SoundModule { }