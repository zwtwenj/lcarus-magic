import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Material } from './material.entity';
import { ConfigService } from '@nestjs/config';
import OSSClient from '../../lib/oss';
import { v4 as uuidv4 } from 'uuid';

interface UploadFile {
  originalname: string;
  buffer: Buffer;
}

@Injectable()
export class MaterialService {
  private ossClient: OSSClient;

  constructor(
    @InjectRepository(Material)
    private materialRepository: Repository<Material>,
    private configService: ConfigService,
  ) {
    this.ossClient = new OSSClient(configService);
  }

  private getFileType(filename: string): 'image' | 'video' | 'voice' {
    const ext = filename.toLowerCase().split('.').pop() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      return 'image';
    } else if (['mp4', 'avi', 'mov', 'wmv', 'flv'].includes(ext)) {
      return 'video';
    } else if (['mp3', 'wav', 'ogg', 'flac', 'aac'].includes(ext)) {
      return 'voice';
    }
    return 'image'; // 默认类型
  }

  async uploadMaterial(projectId: string, file: UploadFile, userId: number): Promise<Material> {
    const ossFileName = `/material/${file.originalname}-${uuidv4()}`;
    const fileUrl = await this.ossClient.uploadBufferAndGetUrl(file.buffer, ossFileName);
    
    if (!fileUrl) {
      throw new Error('文件上传失败');
    }

    const material = new Material();
    material.projectId = parseInt(projectId);
    material.name = file.originalname;
    material.url = fileUrl;
    material.type = this.getFileType(file.originalname);
    material.userId = userId;

    return this.materialRepository.save(material);
  }

  async getProjectMaterials(projectId: string, type: string, keyword: string, userId: number): Promise<Material[]> {
    
    const whereCondition: any = {
      projectId: parseInt(projectId),
      userId: userId,
    };

    if (type) {
      whereCondition.type = type as 'image' | 'video' | 'voice';
    }

    if (keyword) {
      whereCondition.name = Like(`%${keyword}%`);
    }
    
    const result = await this.materialRepository.find({
      where: whereCondition,
    });
    
    return result;
  }

  async deleteMaterial(projectId: string, materialId: string, userId: number): Promise<void> {
    const material = await this.materialRepository.findOne({
      where: {
        id: parseInt(materialId),
        projectId: parseInt(projectId),
        userId: userId,
      },
    });

    if (!material) {
      throw new Error('素材不存在或无权操作');
    }

    await this.materialRepository.remove(material);
  }

  async renameMaterial(projectId: string, materialId: string, newName: string, userId: number): Promise<Material> {
    const material = await this.materialRepository.findOne({
      where: {
        id: parseInt(materialId),
        projectId: parseInt(projectId),
        userId: userId,
      },
    });

    if (!material) {
      throw new Error('素材不存在或无权操作');
    }

    material.name = newName;
    return this.materialRepository.save(material);
  }
}