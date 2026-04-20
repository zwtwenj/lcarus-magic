import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SoundService } from './sound.service';
import { SoundController } from './sound.controller';
import { Sound } from './sound.entity';
import { Voice } from '../voice/voice.entity';
import { Project } from '../project/project.entity';
import { TaskModule } from '../task/task.module';

@Module({
    imports: [TypeOrmModule.forFeature([Sound, Voice, Project]), TaskModule],
    controllers: [SoundController],
    providers: [SoundService],
})
export class SoundModule { }