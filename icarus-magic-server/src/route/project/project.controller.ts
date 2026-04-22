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
import { CreateProjectDto, ListDto, SaveTextDto, OneClickGenerateDto } from './project.dto';

@Controller('project')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  // 创建项目
  @Post('/create')
  async createProject(@Body() project: CreateProjectDto) {
    return this.projectService.createProject(project);
  }

  // 查询项目列表
  @Post('/list')
  async listProjects(@Body() list: ListDto) {
    return this.projectService.listProjects(list);
  }

  // 查询项目信息
  @Get('/info')
  async getProjectInfo(@Query('id', ParseIntPipe) id: number) {
    return this.projectService.getProjectInfo(id);
  }

  // 保存文案
  @Post('/saveText')
  async saveText(@Body() dto: SaveTextDto) {
    return this.projectService.saveText(dto);
  }

  // 一键成片
  @Post('/generate')
  async oneClickGenerate(@Body() dto: OneClickGenerateDto) {
    return this.projectService.oneClickGenerate(dto);
  }
}
