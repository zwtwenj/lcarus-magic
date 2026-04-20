import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './task.entity';
import { TaskStatus } from './task.dto';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
  ) {}

  /**
   * 添加任务
   * @param title 任务标题
   * @param type 任务类型
   * @param userId 用户ID
   * @param req 任务入参
   * @param parentId 父任务ID（可选）
   * @returns 创建的任务
   */
  async createTask(
    title: string,
    type: string,
    userId: string,
    req: any,
    parentId?: number,
  ) {
    const task = this.taskRepository.create({
      title,
      type,
      status: TaskStatus.processing,
      create_time: new Date(),
      req: JSON.stringify(req),
      res: JSON.stringify({}),
    });

    if (userId) {
      task.user = { id: userId } as any;
    }

    if (parentId) {
      task.parent = { id: parentId } as any;
    }

    return await this.taskRepository.save(task);
  }

  /**
   * 获取任务列表
   * @param userId 用户ID
   * @param page 页码
   * @param pageSize 每页数量
   * @param type 任务类型（可选）
   * @param status 任务状态（可选）
   * @returns 任务列表和总数
   */
  async getTasks(
    userId?: number,
    page: number = 1,
    pageSize: number = 10,
    type?: string,
    status?: TaskStatus,
  ) {
    const query = this.taskRepository.createQueryBuilder('task');

    if (userId) {
      query.where('task.user.id = :userId', { userId });
    }

    if (type) {
      query.andWhere('task.type = :type', { type });
    }

    if (status) {
      query.andWhere('task.status = :status', { status });
    }

    query.orderBy('task.create_time', 'DESC');

    const [tasks, total] = await query
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      tasks,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 获取任务详情
   * @param id 任务ID
   * @param userId 用户ID（可选）
   * @returns 任务详情
   */
  async getTask(id: number, userId?: number) {
    const where: any = { id };

    if (userId) {
      where.user = { id: userId };
    }

    return await this.taskRepository.findOne({
      where,
      relations: ['children', 'parent'],
    });
  }

  async getTaskById(id: number) {
    return await this.taskRepository.findOne({
      where: { id }
    });
  }

  async getTaskStatus(id: number, userId: number) {
    const task = await this.taskRepository.createQueryBuilder('task')
      .where('task.id = :id', { id })
      .andWhere('task.user.id = :userId', { userId })
      .select(['task.status', 'task.res'])
      .getOne();

    if (!task) {
      return null;
    }

    return {
      status: task.status,
      res: task.res ? JSON.parse(task.res) : null,
    };
  }

  /**
   * 更新任务状态
   * @param id 任务ID
   * @param status 新状态
   * @param res 任务结果（可选）
   * @returns 更新后的任务
   */
  async updateTaskStatus(id: number, status: TaskStatus, res?: any) {
    const task = await this.taskRepository.findOne({ where: { id } });
    if (!task) {
      throw new Error('Task not found');
    }

    task.status = status;
    if (res) {
      task.res = JSON.stringify(res);
    }

    const updatedTask = await this.taskRepository.save(task);

    // 如果该任务有父任务，更新父任务状态
    if (updatedTask.parent) {
      await this.updateParentTaskStatus(updatedTask.parent.id);
    }

    return updatedTask;
  }

  /**
   * 更新父任务状态
   * @param parentId 父任务ID
   */
  async updateParentTaskStatus(parentId: number) {
    const parentTask = await this.taskRepository.findOne({
      where: { id: parentId },
      relations: ['children']
    });

    if (!parentTask) {
      return;
    }

    const children = parentTask.children || [];
    if (children.length === 0) {
      return;
    }

    // 检查是否有失败的子任务
    const hasFailedTask = children.some(child => child.status === TaskStatus.failed);
    if (hasFailedTask) {
      // 如果有失败的子任务，父任务也设为失败
      await this.taskRepository.update(parentId, { status: TaskStatus.failed });
      return;
    }

    // 检查是否所有子任务都已完成
    const allCompleted = children.every(child => child.status === TaskStatus.completed);
    if (allCompleted) {
      // 首先尝试从父任务的res中获取原始的子任务ID顺序
      let childTaskIds: number[] = [];
      try {
        const parsedRes = parentTask.res ? JSON.parse(parentTask.res) : null;
        if (Array.isArray(parsedRes) && parsedRes.length > 0 && typeof parsedRes[0] === 'number') {
          // 如果res是纯数字数组，说明这是原始的子任务ID顺序
          childTaskIds = parsedRes;
        }
      } catch (error) {
        // 解析失败，使用children的自然顺序
      }

      let finalResults;
      
      if (childTaskIds.length > 0) {
        // 按照原始的子任务ID顺序整理结果
        finalResults = childTaskIds.map(taskId => {
          const child = children.find(c => c.id === taskId);
          if (!child) {
            return { taskId, text: '', res: {} };
          }
          
          try {
            const req = child.req ? JSON.parse(child.req) : {};
            const res = child.res ? JSON.parse(child.res) : {};
            return {
              taskId: child.id,
              text: req.text || '',
              res: res
            };
          } catch (error) {
            return {
              taskId: child.id,
              text: '',
              res: {}
            };
          }
        });
      } else {
        // 如果没有原始顺序，按照children的自然顺序
        finalResults = children.map(child => {
          try {
            const req = child.req ? JSON.parse(child.req) : {};
            const res = child.res ? JSON.parse(child.res) : {};
            return {
              taskId: child.id,
              text: req.text || '',
              res: res
            };
          } catch (error) {
            return {
              taskId: child.id,
              text: '',
              res: {}
            };
          }
        });
      }

      // 更新父任务状态和结果
      await this.taskRepository.update(parentId, {
        status: TaskStatus.completed,
        res: JSON.stringify(finalResults)
      });
    }
  }

  /**
   * 删除任务
   * @param id 任务ID
   * @param userId 用户ID（可选）
   * @returns 删除结果
   */
  async deleteTask(id: number, userId?: number) {
    const where: any = { id };

    if (userId) {
      where.user = { id: userId };
    }

    const result = await this.taskRepository.delete(where);

    return result.affected !== null && result.affected !== undefined && result.affected > 0;
  }
}
