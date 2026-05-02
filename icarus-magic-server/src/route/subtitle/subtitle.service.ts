import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Subtitle } from './subtitle.entity';
import OSSClient from '../../lib/oss';

interface UploadFile {
  originalname: string;
  buffer: Buffer;
}

@Injectable()
export class SubtitleService {
  private ossClient: OSSClient;

  constructor(
    @InjectRepository(Subtitle)
    private subtitleRepository: Repository<Subtitle>,
    private configService: ConfigService
  ) {
    this.ossClient = new OSSClient(configService);
  }

  async uploadSubtitle(file: UploadFile, projectId: number): Promise<Subtitle> {
    const ossFileName = `/subtitle/${projectId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${file.originalname}`;
    const ossUrl = await this.ossClient.uploadBufferAndGetUrl(file.buffer, ossFileName);

    if (!ossUrl) {
      throw new Error('上传字幕失败');
    }

    const subtitle = this.subtitleRepository.create({
      projectId,
      url: ossUrl,
      type: 'custom'
    });

    return await this.subtitleRepository.save(subtitle);
  }

  async getSubtitleListByProjectId(projectId: number): Promise<any[]> {
    const results = await this.subtitleRepository
      .createQueryBuilder('subtitle')
      .where('subtitle.projectId = :projectId', { projectId })
      .andWhere('subtitle.type = :type', { type: 'custom' })
      .orderBy('subtitle.createdAt', 'DESC')
      .getMany();

    return results.map(item => ({
      id: item.id,
      projectId: item.projectId,
      type: item.type,
      url: item.url,
      createdAt: item.createdAt ? new Date(item.createdAt).toISOString().replace('T', ' ').substring(0, 19) : null
    }));
  }
}