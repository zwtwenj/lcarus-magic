import { Controller, Post, Get, Put, Delete, Body, UseGuards, Req, NotFoundException } from '@nestjs/common';
import { TaskService } from './task.service';
import { TaskStatus, TaskDto } from './task.dto';
import { JwtAuthGuard } from '../../transform/jwt-auth.guard';
// import { AuthGuard } from '@/guard/auth.guard';
// import { User } from '@/decorator/user.decorator';
// import { Public } from '@/transform/public.decorator';

@Controller('task')
export class TaskController {
  constructor(private taskService: TaskService) {}

  /**
   * 获取任务列表
   * @param query 查询参数
   * @param user 当前用户
   * @returns 任务列表
   */
  // @UseGuards(AuthGuard)
  // @Get()
  // async getTasks(
  //   @Query() query: {
  //     page?: number;
  //     page_size?: number;
  //     type?: string;
  //     status?: TaskStatus;
  //   },
  //   @User() user: any,
  // ) {
  //   const { page = 1, page_size = 10, type, status } = query;
  //   const result = await this.taskService.getTasks(
  //     user.id,
  //     page,
  //     page_size,
  //     type,
  //     status,
  //   );

  //   return {
  //     code: 100,
  //     message: '获取任务列表成功',
  //     data: result,
  //   };
  // }

  /**
   * 获取任务详情
   * @param id 任务ID
   * @param user 当前用户
   * @returns 任务详情
   */
  // @UseGuards(JwtAuthGuard)
  // @Post('/')
  // async getTask(@Param('id') id: number, @Req() req: any) {
  //   const task = await this.taskService.getTask(id, req.user.userId);
  //   if (!task) {
  //     return {
  //       code: 404,
  //       message: '任务不存在',
  //     };
  //   }

  //   return {
  //     code: 100,
  //     message: '获取任务详情成功',
  //     data: task,
  //   };
  // }

  /**
   * 获取任务状态
   * @param body 包含任务ID
   * @param req 当前用户
   * @returns 任务状态和结果
   */
  @UseGuards(JwtAuthGuard)
  @Post('/status')
  async getTaskStatus(@Body() body: { id: number }, @Req() req: any) {
    const result = await this.taskService.getTaskStatus(body.id, req.user.userId);
    if (!result) {
      throw new NotFoundException('任务不存在或用户不匹配')
    } else {
      return result
    }    
  }

  /**
   * 更新任务状态
   * @param id 任务ID
   * @param body 更新信息
   * @returns 更新后的任务
   */
  // @UseGuards(AuthGuard)
  // @Put(':id/status')
  // async updateTaskStatus(
  //   @Param('id') id: number,
  //   @Body() body: {
  //     status: TaskStatus;
  //     res?: any;
  //   },
  // ) {
  //   const { status, res } = body;
  //   const task = await this.taskService.updateTaskStatus(id, status, res);

  //   return {
  //     code: 100,
  //     message: '任务状态更新成功',
  //     data: task,
  //   };
  // }

  /**
   * 删除任务
   * @param id 任务ID
   * @param user 当前用户
   * @returns 删除结果
   */
  // @UseGuards(AuthGuard)
  // @Delete(':id')
  // async deleteTask(@Param('id') id: number, @User() user: any) {
  //   const success = await this.taskService.deleteTask(id, user.id);
  //   if (!success) {
  //     return {
  //       code: 404,
  //       message: '任务不存在',
  //     };
  //   }

  //   return {
  //     code: 100,
  //     message: '任务删除成功',
  //   };
  // }
}
