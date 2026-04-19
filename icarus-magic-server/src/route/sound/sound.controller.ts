import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { SoundService } from './sound.service';
import { GenerateSoundDto } from './sound.dto';

@Controller('sound')
export class SoundController {
  constructor(private readonly soundService: SoundService) {}

  // 语音合成
  @Post('generate')
  async generate(@Body() dto: GenerateSoundDto) {
    try {
      const result = await this.soundService.generateSound(
        dto.voiceId,
        dto.parameters,
        dto.text,
        dto.projectId,
        dto.voiceUrl
      );
      return result;
    } catch (error) {
      throw new BadRequestException(error.message || '语音合成失败');
    }
  }
}
