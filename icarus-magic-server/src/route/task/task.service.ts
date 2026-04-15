import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './task.entity';
import { TaskDto } from './task.dto';

@Injectable()
export class TaskService {
    constructor(
        @InjectRepository(Task)
        private readonly taskRepository: Repository<Task>,
    ) { }

    // 分页查询用户任务
    async findTaskByUserId(dto: TaskDto) {
        const { userId, type, page, page_size, title, status } = dto;
        const userIdNum = parseInt(userId);

        const query = this.taskRepository
            .createQueryBuilder('task')
            .where('task.userId = :userId', { userId: userIdNum });

        if (status) {
            query.andWhere('task.status = :status', { status });
        }

        if (type) {
            query.andWhere('task.type = :type', { type });
        }

        if (title) {
            query.andWhere('task.title LIKE :title', { title: `%${title}%` });
        }

        query.skip((page - 1) * page_size)
            .take(page_size);

        return query.getMany();
    }
}