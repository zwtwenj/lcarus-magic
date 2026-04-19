import { Module } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './project.entity';
import { User } from '../user/user.entity';
import { ProjectSound } from '../sound/project-sound.entity';
import { Sound } from '../sound/sound.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Project, User, ProjectSound, Sound]),
    ],
    controllers: [ProjectController],
    providers: [ProjectService],
})
export class ProjectModule { }
