import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Project, Segment } from './project.entity';
import { User } from '../user/user.entity';
import { Material } from '../material/material.entity';
import { CreateProjectDto, ListDto, SaveTextDto, OneClickGenerateDto } from './project.dto';
import { callCozeMaterialMatch } from '../../model/coze';
import dayjs from 'dayjs';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Material)
    private readonly materialRepository: Repository<Material>,
    private readonly configService: ConfigService,
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
    
    // 从 segments 中提取声音数据
    let sounds: any[] = [];
    if (project.segments && project.segments.length > 0) {
      // 过滤出有声音的段落
      const segmentsWithSound = project.segments.filter(segment => segment.sound);
      
      sounds = segmentsWithSound.map((segment, index) => ({
        id: index + 1, // 临时ID，实际应该从 sound 表获取
        text: segment.text,
        url: segment.sound,
        voiceId: project.voiceId,
        voice: null // 暂时为null，实际应该从 voice 表获取
      }));
    }
    
    // 格式化返回数据
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      segments: project.segments || [],
      voiceId: project.voiceId || null,
      parameters: project.parameters || null,
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
        sound: null,
        soundId: null,
        duration: null
      }));
    
    // 更新 segments 字段
    project.segments = segments;
    await this.projectRepository.save(project);

    return 'success';
  }

  // 一键成片
  async generate(dto: OneClickGenerateDto, userId: number) {
    const { projectId, materials } = dto;
    
    // 查找项目并提取 segments
    const project = await this.projectRepository.findOne({
      where: { id: parseInt(projectId), user: { id: userId } }
    });
    
    if (!project) {
      throw new NotFoundException('项目不存在或无权限访问');
    }
    
    const segments = project.segments || [];

    if (segments.length === 0) {
      throw new BadRequestException('项目没有可用的语音段落');
    }

    // 查询 materials 并组装 image_data
    let imageData: { material_url: string; tip: string[] }[] = [];
    if (materials && materials.length > 0) {
      const materialRecords = await this.materialRepository.findByIds(materials);
      imageData = materialRecords.map(m => ({
        material_url: m.url,
        tip: m.tags || []
      }));
    }

    if (imageData.length === 0) {
      throw new BadRequestException('没有可用的素材');
    }

    const params = {
      voice_data: segments.map(segment => ({
        index: segment.sort,
        text: segment.text,
        ossUrl: segment.sound,
        format: "mp3",
        durationSeconds: segment.duration
      })),
      image_data: imageData
    }
    
    // 调用 Coze 素材匹配工作流
    const voiceData = params.voice_data.map(v => ({
      index: v.index,
      text: v.text,
      voiceId: project.voiceId || '',
      ossUrl: v.ossUrl,
      format: v.format,
      durationSeconds: v.durationSeconds
    }));
    
    console.log('调用 Coze 素材匹配工作流，参数：', { voiceData, imageData });
    let cozeResult;
    try {
      cozeResult = await callCozeMaterialMatch(voiceData, imageData, this.configService);
      console.log('Coze 调用成功：', cozeResult);
    } catch (error) {
      console.error('Coze 调用失败：', error);
      throw error;
    }
    // {"matched_data":[{"index":1,"text":"近日有网友爆料，快手研发线发布通知，收紧了对第三方编程软件的使用权限。","voiceId":"longhouge_v3","ossUrl":"http://icarus1.oss-cn-hangzhou.aliyuncs.com/sound/1776856661346-1fdh22dwc.mp3","format":"mp3","durationSeconds":9.326,"matched_image_url":"http://icarus1.oss-cn-hangzhou.aliyuncs.com/material/8fb1a76156adf997c22ec96b22696aeb.jpg-69dba10e-266f-4932-a584-ec59b8435277","matched_image_tip":["SpaceX","Cursor AI","人工智能","编程助手","超级计算机","收购","合作"]},{"index":2,"text":"不少习惯用AI辅助开发的员工陷入困境：原本计划用1小时AI生成代码，剩余时间可灵活安排，如今只能手动查找代码模板、翻阅API文档，能否按时完成工作成未知数。有员工调侃，没了Cursor，连Hello World都写不顺手。","voiceId":"longhouge_v3","ossUrl":"http://icarus1.oss-cn-hangzhou.aliyuncs.com/sound/1776856671217-bh4ps6n4r.mp3","format":"mp3","durationSeconds":27.69,"matched_image_url":"http://icarus1.oss-cn-hangzhou.aliyuncs.com/material/ea7be92a0e10926775eb89ad2856b50b.jpg-ceb61364-d4a3-4b8b-8658-9f9d3e681ab7","matched_image_tip":["Cursor","三维几何","白色标志","黑色背景","立方体图标","现代设计","技术品牌"]}],"run_id":"b4b79f45-5457-42c3-814c-489092a724fa"}
    
    return {
      projectId,
      materials,
      segments,
      params,
      cozeResult,
      message: '功能开发中'
    };
  }
}
