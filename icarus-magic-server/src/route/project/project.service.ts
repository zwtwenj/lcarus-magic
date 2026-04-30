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
      
      console.log('调用 Coze 素材匹配工作流，参数：', { voiceData, imageData });
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
      
      // 生成ffmpeg命令
      const ffmpegCommand = await this.ffmpegCommand(matchedData);
      
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
  async ffmpegCommand(data: any) {
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
    
    // 收集所有需要下载的文件URL并去重
    const downloadFiles = [...new Set([
      ...timeline.map(t => t.voice_url).filter(Boolean),
      ...timeline.map(t => t.matched_image_url).filter(Boolean)
    ])];
    
    const params = {
      project: `./${projectName}_${timestamp}`,
      timeline,
      subtitle: null,
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
}

// {
//     "projectId": "7",
//     "materials": [
//         "18",
//         "19",
//         "20",
//         "21",
//         "22"
//     ],
//     "segments": [
//         {
//             "sort": 1,
//             "text": "近日有网友爆料，快手研发线发布通知，收紧了对第三方编程软件的使用权限。",
//             "sound": "http://icarus1.oss-cn-hangzhou.aliyuncs.com/sound/1776856661346-1fdh22dwc.mp3",
//             "soundId": 76,
//             "duration": 9.326
//         },
//         {
//             "sort": 2,
//             "text": "不少习惯用AI辅助开发的员工陷入困境：原本计划用1小时AI生成代码，剩余时间可灵活安排，如今只能手动查找代码模板、翻阅API文档，能否按时完成工作成未知数。有员工调侃，没了Cursor，连Hello World都写不顺手。",
//             "sound": "http://icarus1.oss-cn-hangzhou.aliyuncs.com/sound/1776856671217-bh4ps6n4r.mp3",
//             "soundId": 77,
//             "duration": 27.69
//         }
//     ],
//     "params": {
//         "voice_data": [
//             {
//                 "index": 1,
//                 "text": "近日有网友爆料，快手研发线发布通知，收紧了对第三方编程软件的使用权限。",
//                 "ossUrl": "http://icarus1.oss-cn-hangzhou.aliyuncs.com/sound/1776856661346-1fdh22dwc.mp3",
//                 "format": "mp3",
//                 "durationSeconds": 9.326
//             },
//             {
//                 "index": 2,
//                 "text": "不少习惯用AI辅助开发的员工陷入困境：原本计划用1小时AI生成代码，剩余时间可灵活安排，如今只能手动查找代码模板、翻阅API文档，能否按时完成工作成未知数。有员工调侃，没了Cursor，连Hello World都写不顺手。",
//                 "ossUrl": "http://icarus1.oss-cn-hangzhou.aliyuncs.com/sound/1776856671217-bh4ps6n4r.mp3",
//                 "format": "mp3",
//                 "durationSeconds": 27.69
//             }
//         ],
//         "image_data": [
//             {
//                 "material_url": "http://icarus1.oss-cn-hangzhou.aliyuncs.com/material/e8d884752ddcb00871d10026f47f7090.jpg-d9802f9b-13be-41e2-bb76-975f4b4ccee2",
//                 "tip": [
//                     "AI code generation",
//                     "web application development",
//                     "Vibe Code Bench",
//                     "end-to-end evaluation",
//                     "natural language programming",
//                     "autonomous browser agent",
//                     "software engineering benchmark"
//                 ]
//             },
//             {
//                 "material_url": "http://icarus1.oss-cn-hangzhou.aliyuncs.com/material/5f2e6b100c794ada7ec2854b5b686c14.jpg-2d15b134-e8b2-4fa1-9192-819cf130f1de",
//                 "tip": [
//                     "代码库结构",
//                     "开发者指南",
//                     "Intro.md",
//                     "项目架构",
//                     "学习路径",
//                     "GitHub PR",
//                     "仓库介绍"
//                 ]
//             },
//             {
//                 "material_url": "http://icarus1.oss-cn-hangzhou.aliyuncs.com/material/8fb1a76156adf997c22ec96b22696aeb.jpg-69dba10e-266f-4932-a584-ec59b8435277",
//                 "tip": [
//                     "SpaceX",
//                     "Cursor AI",
//                     "人工智能",
//                     "编程助手",
//                     "超级计算机",
//                     "收购",
//                     "合作"
//                 ]
//             },
//             {
//                 "material_url": "http://icarus1.oss-cn-hangzhou.aliyuncs.com/material/ea7be92a0e10926775eb89ad2856b50b.jpg-ceb61364-d4a3-4b8b-8658-9f9d3e681ab7",
//                 "tip": [
//                     "Cursor",
//                     "三维几何",
//                     "白色标志",
//                     "黑色背景",
//                     "立方体图标",
//                     "现代设计",
//                     "技术品牌"
//                 ]
//             },
//             {
//                 "material_url": "http://icarus1.oss-cn-hangzhou.aliyuncs.com/material/6020baf2e2d9cb48b8b55f74e277435c.jpeg-bbc5feb6-ab24-4343-a634-8871b5f52ea9",
//                 "tip": [
//                     "字节跳动",
//                     "ByteDance",
//                     "办公大楼",
//                     "现代建筑",
//                     "蓝天绿地",
//                     "公司总部",
//                     "企业标志"
//                 ]
//             }
//         ]
//     },
//     "cozeResult": {
//         "status": 200,
//         "contentType": "application/json",
//         "bodyText": "{\"matched_data\":[{\"index\":1,\"text\":\"近日有网友爆料，快手研发线发布通知，收紧了对第三方编程软件的使用权限。\",\"voiceId\":\"longhouge_v3\",\"ossUrl\":\"http://icarus1.oss-cn-hangzhou.aliyuncs.com/sound/1776856661346-1fdh22dwc.mp3\",\"format\":\"mp3\",\"durationSeconds\":9.326,\"matched_image_url\":\"http://icarus1.oss-cn-hangzhou.aliyuncs.com/material/8fb1a76156adf997c22ec96b22696aeb.jpg-69dba10e-266f-4932-a584-ec59b8435277\",\"matched_image_tip\":[\"SpaceX\",\"Cursor AI\",\"人工智能\",\"编程助手\",\"超级计算机\",\"收购\",\"合作\"]},{\"index\":2,\"text\":\"不少习惯用AI辅助开发的员工陷入困境：原本计划用1小时AI生成代码，剩余时间可灵活安排，如今只能手动查找代码模板、翻阅API文档，能否按时完成工作成未知数。有员工调侃，没了Cursor，连Hello World都写不顺手。\",\"voiceId\":\"longhouge_v3\",\"ossUrl\":\"http://icarus1.oss-cn-hangzhou.aliyuncs.com/sound/1776856671217-bh4ps6n4r.mp3\",\"format\":\"mp3\",\"durationSeconds\":27.69,\"matched_image_url\":\"http://icarus1.oss-cn-hangzhou.aliyuncs.com/material/ea7be92a0e10926775eb89ad2856b50b.jpg-ceb61364-d4a3-4b8b-8658-9f9d3e681ab7\",\"matched_image_tip\":[\"Cursor\",\"三维几何\",\"白色标志\",\"黑色背景\",\"立方体图标\",\"现代设计\",\"技术品牌\"]}],\"run_id\":\"836ce63f-de4e-42e5-afe4-70b4ecff68c8\"}"
//     },
//     "ffmpegCommand": {
//         "params": {
//             "project": "./project_c0747fb5-6a98-4378-be9e-8948428e2c78_20260426004604",
//             "timeline": [
//                 {
//                     "index": 1,
//                     "text": "近日有网友爆料，快手研发线发布通知，收紧了对第三方编程软件的使用权限。",
//                     "voice_url": "http://icarus1.oss-cn-hangzhou.aliyuncs.com/sound/1776856661346-1fdh22dwc.mp3",
//                     "duration": 9.326,
//                     "matched_image_url": "http://icarus1.oss-cn-hangzhou.aliyuncs.com/material/8fb1a76156adf997c22ec96b22696aeb.jpg-69dba10e-266f-4932-a584-ec59b8435277"
//                 },
//                 {
//                     "index": 2,
//                     "text": "不少习惯用AI辅助开发的员工陷入困境：原本计划用1小时AI生成代码，剩余时间可灵活安排，如今只能手动查找代码模板、翻阅API文档，能否按时完成工作成未知数。有员工调侃，没了Cursor，连Hello World都写不顺手。",
//                     "voice_url": "http://icarus1.oss-cn-hangzhou.aliyuncs.com/sound/1776856671217-bh4ps6n4r.mp3",
//                     "duration": 27.69,
//                     "matched_image_url": "http://icarus1.oss-cn-hangzhou.aliyuncs.com/material/ea7be92a0e10926775eb89ad2856b50b.jpg-ceb61364-d4a3-4b8b-8658-9f9d3e681ab7"
//                 }
//             ],
//             "subtitle": null,
//             "output": {
//                 "name": "final_video_20260426004604",
//                 "width": 375,
//                 "height": 667
//             }
//         },
//         "ffmpegResult": {
//             "status": 200,
//             "contentType": "application/json",
//             "bodyText": "{\"all_commands\":[\"ffmpeg -y -loop 1 -i http://icarus1.oss-cn-hangzhou.aliyuncs.com/material/8fb1a76156adf997c22ec96b22696aeb.jpg-69dba10e-266f-4932-a584-ec59b8435277 -i http://icarus1.oss-cn-hangzhou.aliyuncs.com/sound/1776856661346-1fdh22dwc.mp3 -vf \\\"scale=375:667:force_original_aspect_ratio=increase,crop=375:667\\\" -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -t 9.326 -shortest ./project_c0747fb5-6a98-4378-be9e-8948428e2c78_20260426004604/segment_1.mp4\",\"ffmpeg -y -loop 1 -i http://icarus1.oss-cn-hangzhou.aliyuncs.com/material/ea7be92a0e10926775eb89ad2856b50b.jpg-ceb61364-d4a3-4b8b-8658-9f9d3e681ab7 -i http://icarus1.oss-cn-hangzhou.aliyuncs.com/sound/1776856671217-bh4ps6n4r.mp3 -vf \\\"scale=375:667:force_original_aspect_ratio=increase,crop=375:667\\\" -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -t 27.69 -shortest ./project_c0747fb5-6a98-4378-be9e-8948428e2c78_20260426004604/segment_2.mp4\",\"rm -f ./project_c0747fb5-6a98-4378-be9e-8948428e2c78_20260426004604/filelist.txt && echo file segment_1.mp4 >> ./project_c0747fb5-6a98-4378-be9e-8948428e2c78_20260426004604/filelist.txt && echo file segment_2.mp4 >> ./project_c0747fb5-6a98-4378-be9e-8948428e2c78_20260426004604/filelist.txt\",\"ffmpeg -y -f concat -safe 0 -i ./project_c0747fb5-6a98-4378-be9e-8948428e2c78_20260426004604/filelist.txt -c copy ./project_c0747fb5-6a98-4378-be9e-8948428e2c78_20260426004604/_temp_concat.mp4\",\"mv ./project_c0747fb5-6a98-4378-be9e-8948428e2c78_20260426004604/_temp_concat.mp4 ./project_c0747fb5-6a98-4378-be9e-8948428e2c78_20260426004604/final_video_20260426004604.mp4\",\"ffmpeg -y -loop 1 -i http://icarus1.oss-cn-hangzhou.aliyuncs.com/material/8fb1a76156adf997c22ec96b22696aeb.jpg-69dba10e-266f-4932-a584-ec59b8435277 -i http://icarus1.oss-cn-hangzhou.aliyuncs.com/sound/1776856661346-1fdh22dwc.mp3 -vf \\\"scale=375:667:force_original_aspect_ratio=increase,crop=375:667\\\" -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -t 9.326 -shortest ./project_c0747fb5-6a98-4378-be9e-8948428e2c78_20260426004604/segment_1.mp4 && ffmpeg -y -loop 1 -i http://icarus1.oss-cn-hangzhou.aliyuncs.com/material/ea7be92a0e10926775eb89ad2856b50b.jpg-ceb61364-d4a3-4b8b-8658-9f9d3e681ab7 -i http://icarus1.oss-cn-hangzhou.aliyuncs.com/sound/1776856671217-bh4ps6n4r.mp3 -vf \\\"scale=375:667:force_original_aspect_ratio=increase,crop=375:667\\\" -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -t 27.69 -shortest ./project_c0747fb5-6a98-4378-be9e-8948428e2c78_20260426004604/segment_2.mp4 && rm -f ./project_c0747fb5-6a98-4378-be9e-8948428e2c78_20260426004604/filelist.txt && echo file segment_1.mp4 >> ./project_c0747fb5-6a98-4378-be9e-8948428e2c78_20260426004604/filelist.txt && echo file segment_2.mp4 >> ./project_c0747fb5-6a98-4378-be9e-8948428e2c78_20260426004604/filelist.txt && ffmpeg -y -f concat -safe 0 -i ./project_c0747fb5-6a98-4378-be9e-8948428e2c78_20260426004604/filelist.txt -c copy ./project_c0747fb5-6a98-4378-be9e-8948428e2c78_20260426004604/_temp_concat.mp4 && mv ./project_c0747fb5-6a98-4378-be9e-8948428e2c78_20260426004604/_temp_concat.mp4 ./project_c0747fb5-6a98-4378-be9e-8948428e2c78_20260426004604/final_video_20260426004604.mp4\"],\"run_id\":\"10e3ee7b-3a9e-4681-9ea5-c06be88e4338\"}"
//         }
//     },
//     "message": "功能开发中"
// }

// {
//     "project": "./download-1774859212508",
//     "timeline": [
//         {
//             "index": 0,
//             "text": "2026年3月19日",
//             "voice_url": "./download-1774859212508/synth-1774859142511-4b19aa4c1e81.mp3",
//             "duration": 2.22,
//             "matched_image_url": "./download-1774859212508/1774857857460-321658397.jpg"
//         }
//     ],
//     "subtitle": {
//         "url": "./download-1774859212508/text.srt",
//         "bottom": 300,
//         "align": "center",
//         "fontsize": 24
//     },
//     "output": {
//         "name": "final_video",
//         "width": 375,
//         "height": 667
//     }
// }