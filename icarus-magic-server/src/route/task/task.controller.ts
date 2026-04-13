import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  ParseIntPipe,
  Logger,
} from '@nestjs/common';
import { TaskService } from './task.service';
import { Task } from './task.entity';
import { TaskDto } from './task.dto';

@Controller('task')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post('/getTasks')
  getUserTasks(@Body() dto: TaskDto) {
    return this.taskService.findTaskByUserId(dto);
  }
}
