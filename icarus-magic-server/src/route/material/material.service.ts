import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Material } from './material.entity';
import { ConfigService } from '@nestjs/config';
import OSSClient from '../../lib/oss';
import { v4 as uuidv4 } from 'uuid';
import { tagImage as qwenVLTagImage } from '../../model/qwenVL';

interface UploadFile {
  originalname: string;
  buffer: Buffer;
}

@Injectable()
export class MaterialService {
  private ossClient: OSSClient;

  private formatDate(date: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }

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
    return 'image';
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

  async getProjectMaterials(projectId: string, type: string, keyword: string, userId: number): Promise<{ id: number; type: string; name: string; url: string; projectId: number; userId: number; createdAt: Date; tags?: string[]; fileSize?: string; project: { id: number; name: string } }[]> {

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

    const materials = await this.materialRepository.find({
      where: whereCondition,
      relations: ['project'],
    });

    return materials.map(m => ({
      id: m.id,
      type: m.type,
      name: m.name,
      url: m.url,
      projectId: m.projectId,
      userId: m.userId,
      createdAt: m.createdAt,
      tags: m.tags,
      fileSize: m.fileSize,
      project: {
        id: m.project.id,
        name: m.project.name,
      },
    }));
  }

  async getMaterialDetail(materialId: string, userId: number): Promise<{ id: number; type: string; name: string; url: string; projectId: number; userId: number; createdAt: string; tags?: string[]; fileSize?: string; project: { id: number; name: string } }> {
    const material = await this.materialRepository.findOne({
      where: {
        id: parseInt(materialId),
        userId: userId,
      },
      relations: ['project'],
    });

    if (!material) {
      throw new Error('素材不存在或无权访问');
    }

    return {
      id: material.id,
      type: material.type,
      name: material.name,
      url: material.url,
      projectId: material.projectId,
      userId: material.userId,
      createdAt: this.formatDate(material.createdAt),
      tags: material.tags,
      fileSize: material.fileSize,
      project: {
        id: material.project.id,
        name: material.project.name,
      },
    };
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

  async tagMaterialImage(projectId: string, materialId: string, userId: number): Promise<Material> {
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

    if (material.type !== 'image') {
      throw new Error('只有图片素材才能打标');
    }

    const tagResult = await qwenVLTagImage(this.configService, {
      image: material.url,
    });

    material.tags = tagResult.tags || [];

    return this.materialRepository.save(material);
  }

  async updateMaterialTags(projectId: string, materialId: string, tags: string[], userId: number): Promise<Material> {
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

    material.tags = tags;

    return this.materialRepository.save(material);
  }
}
