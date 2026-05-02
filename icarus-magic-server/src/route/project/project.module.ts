import { Module } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './project.entity';
import { User } from '../user/user.entity';
import { Material } from '../material/material.entity';
import { Task } from '../task/task.entity';
import { Subtitle } from '../subtitle/subtitle.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Project, User, Material, Task, Subtitle]),
    ],
    controllers: [ProjectController],
    providers: [ProjectService],
})
export class ProjectModule { }
