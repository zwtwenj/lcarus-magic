import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SoundService } from './sound.service';
import { SoundController } from './sound.controller';
import { Sound } from './sound.entity';
import { ProjectSound } from './project-sound.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Sound, ProjectSound])],
    controllers: [SoundController],
    providers: [SoundService],
})
export class SoundModule { }
