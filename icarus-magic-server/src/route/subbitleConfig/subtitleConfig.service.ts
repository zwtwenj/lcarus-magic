import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubtitleConfig } from './subtitleConfig.entity';

interface SubtitleConfigData {
  fontname: string;
  fontsize: number;
  primaryColor: string;
  secondaryColor: string;
  outlineColor: string;
  backColor: string;
}

@Injectable()
export class SubtitleConfigService {
  constructor(
    @InjectRepository(SubtitleConfig)
    private readonly subtitleConfigRepository: Repository<SubtitleConfig>
  ) {}

  async findAllByUserId(userId: number): Promise<SubtitleConfig[]> {
    return await this.subtitleConfigRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' }
    });
  }

  private hexToAssColor(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `&H00${b.toString(16).padStart(2, '0').toUpperCase()}${g.toString(16).padStart(2, '0').toUpperCase()}${r.toString(16).padStart(2, '0').toUpperCase()}&`;
  }

  private generateAssString(config: SubtitleConfigData): string {
    const primaryColor = this.hexToAssColor(config.primaryColor);
    const secondaryColor = this.hexToAssColor(config.secondaryColor);
    const outlineColor = this.hexToAssColor(config.outlineColor);
    const backColor = this.hexToAssColor(config.backColor);

    return `[Script Info]
Title: My Dynamic Subtitles
ScriptType: v4.00+
PlayResX: 375
PlayResY: 667

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${config.fontname},${config.fontsize},${primaryColor},${secondaryColor},${outlineColor},${backColor},0,0,0,0,100,100,0,0,1,2,0,2,10,10,10,1`;
  }

  async saveConfig(name: string, config: SubtitleConfigData, userId: number): Promise<SubtitleConfig> {
    const assStr = this.generateAssString(config);
    const configJson = JSON.stringify(config);
    
    const subtitleConfig = this.subtitleConfigRepository.create({
      name,
      config: configJson,
      assStr,
      userId
    });
    
    return await this.subtitleConfigRepository.save(subtitleConfig);
  }

  async delete(id: number, userId: number): Promise<void> {
    await this.subtitleConfigRepository.delete({ id, userId });
  }
}