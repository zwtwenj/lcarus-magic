import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './project.entity';
import { User } from '../user/user.entity';
import { CreateProjectDto, ListDto } from './project.dto';
import dayjs from 'dayjs';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // 创建项目
  async createProject(project: CreateProjectDto) {
    const { name, description, userId } = project;
    if (!name || !description || !userId) {
      throw new BadRequestException('项目名称、描述、用户ID不能为空');
    }
    
    // 查找用户
    const user = await this.userRepository.findOne({ where: { id: parseInt(userId) } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    
    // 创建项目
    const newProject = this.projectRepository.create({
      name,
      description,
      status: 'pending',
      user,
    });
    
    const savedProject = await this.projectRepository.save(newProject);
    
    // 返回完整的项目信息
    return {
      id: savedProject.id,
      name: savedProject.name,
      description: savedProject.description,
      status: savedProject.status,
      createdAt: savedProject.createdAt ? dayjs(savedProject.createdAt).format('YYYY-MM-DD HH:mm:ss') : null,
    };
  }

  // 查询项目列表
  async listProjects(list: ListDto) {
    const { page, page_size, userId } = list;
    
    // 构建查询
    const query = this.projectRepository.createQueryBuilder('project');
    
    // 如果提供了 userId，则过滤
    if (userId) {
      query.where('project.user.id = :userId', { userId: parseInt(userId) });
    }
    
    // 计算总数
    const total = await query.getCount();
    
    // 分页查询
    const projects = await query
      .skip((page - 1) * page_size)
      .take(page_size)
      .getMany();
    
    // 格式化返回数据
    const formattedProjects = projects.map(project => ({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      createdAt: project.createdAt ? dayjs(project.createdAt).format('YYYY-MM-DD HH:mm:ss') : null,
    }));
    
    return {
      list: formattedProjects,
      total,
      page,
      page_size,
    };
  }
}
