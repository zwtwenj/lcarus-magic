import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Project, Segment } from './project.entity';
import { User } from '../user/user.entity';
import { Material } from '../material/material.entity';
import { Task } from '../task/task.entity';
import { TaskStatus } from '../task/task.dto';
import { CreateProjectDto, ListDto, SaveTextDto, OneClickGenerateDto } from './project.dto';
import { callCozeMaterialMatch, callCozeFfmpegCommand } from '../../model/coze';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

@Injectable()
export class ProjectService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Material)
    private readonly materialRepository: Repository<Material>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
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
    const { projectId, materials, subtitleId } = dto;

    // 生成字幕文件并上传到OSS
    const { assContent, ossUrl } = await this.generateSubtitle(parseInt(projectId), userId);
    
    // 创建 video 类型任务（提前创建，便于追踪状态）
    let task = this.taskRepository.create({
      title: `一键成片`,
      type: 'video',
      status: TaskStatus.processing,
      create_time: new Date(),
      req: JSON.stringify({ projectId, materials, subtitleId }),
      res: JSON.stringify({}),
    });
    task.user = { id: userId } as any;
    task = await this.taskRepository.save(task);
    
    // 异步执行后续逻辑，不阻塞返回
    this.executeGenerate(task.id, projectId, materials, subtitleId, userId);
    
    // 立即返回 taskId，前端通过轮询查询任务状态
    return {
      taskId: task.id
    };
  }

  // 异步执行一键成片逻辑
  private async executeGenerate(taskId: number, projectId: string, materials: string[], subtitleId: string | undefined, userId: number) {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) {
      return;
    }

    try {
      // 查找项目并提取 segments
      const project = await this.projectRepository.findOne({
        where: { id: parseInt(projectId), user: { id: userId } }
      });
      
      if (!project) {
        throw new NotFoundException('项目不存在或无权限访问');
      }
      
      // 更新任务标题（包含项目名）
      task.title = `一键成片-${project.name}`;
      await this.taskRepository.save(task);
      
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
      
      console.log('调用 Coze 素材匹配工作流，参数：', JSON.stringify(voiceData));
      console.log('调用 Coze 素材匹配工作流，参数：', JSON.stringify(imageData));
      let cozeResult;
      try {
        cozeResult = await callCozeMaterialMatch(voiceData, imageData, this.configService);
        console.log('Coze 调用成功：', cozeResult);
      } catch (error) {
        console.error('Coze 调用失败：', error);
        throw error;
      }
      
      // 解析 Coze 返回的 bodyText
      let matchedData;
      try {
        matchedData = JSON.parse(cozeResult.bodyText);
        console.log('解析 matchedData 成功：', matchedData);
      } catch (error) {
        console.error('解析 matchedData 失败：', error);
        throw new Error('解析 Coze 返回数据失败');
      }

      // 生成字幕文件并上传到 OSS
      const { ossUrl: subtitleOssUrl } = await this.generateSubtitle(parseInt(projectId), userId);
      console.log(`✅ 字幕生成并上传成功：${subtitleOssUrl}`);

      // 生成ffmpeg命令（传入字幕URL）
      const ffmpegCommand = await this.ffmpegCommand(matchedData, subtitleOssUrl);

      // 执行 FFmpeg 命令
      const executeResult = await this.executeFfmpeg(ffmpegCommand);

      // 提取 OSS URL
      const ossUrl = executeResult.runShellResult?.ossUrl || null;

      // 更新任务状态和结果（只保存 ossUrl）
      task.status = TaskStatus.completed;
      task.res = JSON.stringify({
        ossUrl: ossUrl
      });
      await this.taskRepository.save(task);
      console.log(`✅ 一键成片任务完成，taskId: ${task.id}, ossUrl: ${ossUrl}`);

    } catch (error) {
      // 更新任务状态为失败
      task.status = TaskStatus.failed;
      task.res = JSON.stringify({ error: error.message });
      await this.taskRepository.save(task);
      console.error('一键成片失败：', error);
    }
  }

  // 生成ffmpeg命令
  async ffmpegCommand(data: any, subtitleUrl?: string) {
    // 输入数据示例：
    // {"matched_data":[{"index":1,"text":"近日有网友爆料...","voiceId":"longhouge_v3","ossUrl":"http://...","format":"mp3","durationSeconds":9.326,"matched_image_url":"http://...","matched_image_tip":[...]}],"run_id":"b4b79f45-5457-42c3-814c-489092a724fa"}

    const projectName = `project_${uuidv4()}`;
    const timestamp = dayjs().format('YYYYMMDDHHmmss');

    const timeline = (data.matched_data || []).map((item: any) => ({
      index: item.index,
      text: item.text,
      voice_url: item.ossUrl,
      duration: item.durationSeconds,
      matched_image_url: item.matched_image_url
    }));

    // 收集所有需要下载的文件URL并去重（包括字幕URL）
    const downloadFiles = [...new Set([
      ...timeline.map(t => t.voice_url).filter(Boolean),
      ...timeline.map(t => t.matched_image_url).filter(Boolean),
      ...(subtitleUrl ? [subtitleUrl] : [])
    ])];

    const params = {
      project: `./${projectName}_${timestamp}`,
      timeline,
      subtitle: subtitleUrl || null,
      output: {
        name: `final_video_${timestamp}`,
        width: 375,
        height: 667
      }
    };

    // 调用 Coze FFmpeg 命令生成工作流
    console.log('调用 Coze FFmpeg 命令生成工作流，参数：', params);
    const ffmpegResult = await callCozeFfmpegCommand(params, this.configService);
    console.log('FFmpeg 命令生成成功：', ffmpegResult);

    return {
      params,
      ffmpegResult,
      downloadFiles
    };
  }

  // 执行 FFmpeg 命令（下载文件并执行shell）
  async executeFfmpeg(ffmpegCommandResult: any) {
    const { params, ffmpegResult, downloadFiles } = ffmpegCommandResult;
    
    // 提取项目名称（去掉 ./ 前缀）
    const projectName = params.project.replace(/^\.\//, '');
    const outputName = params.output.name;
    
    // 调用 file-server 下载文件
    let downloadResult;
    try {
      console.log('调用 file-server 下载文件：', { project: params.project, files: downloadFiles });
      downloadResult = await axios.post('http://localhost:3001/download-files', {
        project: params.project,
        files: downloadFiles
      });
      console.log('文件下载成功：', downloadResult.data);
    } catch (error) {
      console.error('文件下载失败：', error);
      throw new Error('文件下载失败');
    }
    
    // 调用 file-server 执行 FFmpeg 命令
    let runShellResult;
    try {
      const commands = JSON.parse(ffmpegResult.bodyText).all_commands
      const command = commands[commands.length - 1]
      const scriptBase64 = Buffer.from(command).toString('base64');
      runShellResult = await axios.post('http://localhost:3001/run-shell', {
        script: scriptBase64,
        project: projectName,
        outputName: outputName
      });
      console.log('FFmpeg 命令执行成功：', runShellResult.data);
    } catch (error) {
      console.error('FFmpeg 命令执行失败：', error);
      throw new Error('FFmpeg 命令执行失败');
    }
    
    return {
      ...ffmpegCommandResult,
      downloadResult: downloadResult.data,
      runShellResult: runShellResult.data
    };
  }

  // 生成字幕文件（.ass格式）并上传到OSS
  async generateSubtitle(projectId: number, userId: number, subtitleConfig?: any): Promise<{ assContent: string; ossUrl: string | undefined }> {
    // 1. 根据 projectId 获取 segments
    const project = await this.projectRepository.findOne({
      where: { id: projectId, user: { id: userId } }
    });
    
    if (!project) {
      throw new NotFoundException('项目不存在或无权限访问');
    }
    
    const segments = project.segments || [];
    
    if (segments.length === 0) {
      throw new BadRequestException('项目没有可用的语音段落');
    }
    
    // 2. 组装 .ass 字符串
    const assContent = this.buildAssContent(segments, subtitleConfig);
    
    // 3. 上传到 OSS
    const ossUrl = await this.uploadSubtitleToOSS(assContent, projectId);
    
    return {
      assContent,
      ossUrl
    };
  }

  // 上传字幕文件到 OSS
  private async uploadSubtitleToOSS(assContent: string, projectId: number): Promise<string | undefined> {
    try {
      // 创建 OSS 客户端实例
      const OSSClient = require('../../lib/oss').default;
      const ossClient = new OSSClient(this.configService);
      
      // 生成文件名：subtitle/{projectId}_{timestamp}.ass
      const timestamp = Date.now();
      const ossFileName = `subtitle/${projectId}_${timestamp}.ass`;
      
      // 将字符串转换为 Buffer
      const buffer = Buffer.from(assContent, 'utf-8');
      
      // 上传到 OSS
      const url = await ossClient.uploadBufferAndGetUrl(buffer, ossFileName);
      
      console.log(`✅ 字幕上传 OSS 成功：${url}`);
      return url;
    } catch (error) {
      console.error('❌ 字幕上传 OSS 失败:', error);
      return undefined;
    }
  }

  // 构建 .ass 文件内容
  private buildAssContent(segments: Segment[], config?: any): string {
    // 默认配置
    const defaultConfig = {
      fontname: 'Microsoft YaHei',
      fontsize: '24',
      color: '&H00FFFFFF',
      outline_color: '&H00000000',
      back_color: '&H80000000',
      marginL: '10',
      marginR: '10',
      marginV: '10'
    };
    
    const cfg = { ...defaultConfig, ...config };
    
    let ass = `[Script Info]
Title: Generated Subtitle
ScriptType: v4.00+
PlayResX: 375
PlayResY: 667

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${cfg.fontname},${cfg.fontsize},${cfg.color},${cfg.color},${cfg.outline_color},${cfg.back_color},0,0,0,0,100,100,0,0,1,2,0,2,${cfg.marginL},${cfg.marginR},${cfg.marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;
    
    // 生成 Dialogue 行
    let currentTime = 0;
    segments.forEach((segment, index) => {
      const text = segment.text || '';
      const duration = segment.duration || 3; // 默认3秒
      
      // 断句处理
      const sentences = this.splitText(text);
      
      if (sentences.length === 0) {
        return;
      }
      
      // 按照句子长度均分时间
      const totalLength = sentences.reduce((sum, s) => sum + s.length, 0);
      
      sentences.forEach(sentence => {
        // 根据句子长度计算该句的显示时间
        const sentenceDuration = totalLength > 0 ? (sentence.length / totalLength) * duration : duration / sentences.length;
        
        const startTime = this.formatTime(currentTime);
        const endTime = this.formatTime(currentTime + sentenceDuration);
        
        ass += `Dialogue: 0,${startTime},${endTime},Default,,0,0,0,,${sentence}\n`;
        
        currentTime += sentenceDuration;
      });
    });
    
    return ass;
  }

  // 文本断句处理
  private splitText(text: string): string[] {
    if (!text) return [];
    
    // 匹配中文标点符号进行断句：，。！？；：、。！？""''（）
    // 使用非捕获组来匹配但不包含标点符号
    const regex = /([^，。！？；：、""''（）\n]+)/g;
    const matches = text.match(regex);
    
    if (!matches) return [];
    
    // 过滤空字符串并去除首尾空格
    return matches.map(s => s.trim()).filter(s => s.length > 0);
  }

  // 清理文本中的控制字符（用于 JSON 序列化）
  private cleanText(text: string): string {
    if (!text) return '';
    
    // 移除所有控制字符（除了常见的空格）
    // 控制字符的 Unicode 范围：\u0000-\u001F 和 \u007F-\u009F
    return text.replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim();
  }

  // 格式化时间为 ASS 格式 (0:00:00.00)
  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }
}