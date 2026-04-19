import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project, Segment } from './project.entity';
import { User } from '../user/user.entity';
import { ProjectSound } from '../sound/project-sound.entity';
import { Sound } from '../sound/sound.entity';
import { CreateProjectDto, ListDto, SaveTextDto } from './project.dto';
import dayjs from 'dayjs';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ProjectSound)
    private readonly projectSoundRepository: Repository<ProjectSound>,
    @InjectRepository(Sound)
    private readonly soundRepository: Repository<Sound>,
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
      segments: [],
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

  // 查询项目信息
  async getProjectInfo(id: number) {
    // 根据ID查询项目
    const project = await this.projectRepository.findOne({ where: { id } });
    
    if (!project) {
      throw new NotFoundException('项目不存在');
    }
    
    // 获取关联的声音数据
    let sounds: any[] = [];
    const projectSound = await this.projectSoundRepository.findOne({
      where: { projectId: id },
    });
    
    if (projectSound && projectSound.soundIds && projectSound.soundIds.length > 0) {
      const soundEntities = await this.soundRepository.find({
        where: projectSound.soundIds.map(id => ({ id })),
        relations: ['voice'],
      });
      
      const soundMap = new Map(soundEntities.map(s => [s.id, s]));
      
      // 按 sortOrders 顺序排列
      sounds = projectSound.sortOrders.map((soundId) => {
        const sound = soundMap.get(soundId);
        if (sound) {
          return {
            id: sound.id,
            text: sound.text,
            url: sound.url,
            voiceId: sound.voiceId,
            voice: sound.voice,
          };
        }
        return null;
      }).filter(Boolean);
    }
    
    // 格式化返回数据
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      segments: project.segments || [],
      sounds,
      createdAt: project.createdAt ? dayjs(project.createdAt).format('YYYY-MM-DD HH:mm:ss') : null,
    };
  }

  // 合成音频

  // 保存文案
  async saveText(dto: SaveTextDto) {
    const { projectId, text } = dto;
    
    // 查找项目
    const project = await this.projectRepository.findOne({ where: { id: projectId } });
    if (!project) {
      throw new NotFoundException('项目不存在');
    }
    
    // 将文本按换行符分割（单个或多个换行符都视为一个分隔符）
    const segments = text
      .split(/\n+/)
      .filter(segment => segment.trim() !== '') // 过滤空段落
      .map((segmentText, index) => ({
        sort: index + 1,
        text: segmentText.trim(),
        sound: null
      }));
    
    // 更新 segments 字段
    project.segments = segments;
    await this.projectRepository.save(project);

    return 'success';
  }
}
