import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  ParseIntPipe,
  Logger,
} from '@nestjs/common';
import { ProjectService } from './project.service';
import { CreateProjectDto } from './project.dto';

@Controller('project')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  // 创建项目
  @Post('/create')
  async createProject(@Body() project: CreateProjectDto) {
    return this.projectService.createProject(project);
  }
}
