import { Controller, Post, Body, BadRequestException, Req, UseGuards } from '@nestjs/common';
import { SoundService } from './sound.service';
import { GenerateSoundDto, GenerateProjectSoundsDto } from './sound.dto';
import { JwtAuthGuard } from '../../transform/jwt-auth.guard';

@Controller('sound')
export class SoundController {
  constructor(private readonly soundService: SoundService) {}

  // 语音合成试听
  @Post('/generate/test')
  @UseGuards(JwtAuthGuard)
  async generate(@Body() dto: GenerateSoundDto, @Req() req: any) {
    try {
      const result = await this.soundService.generateSound({
        voiceId: dto.voiceId,
        parameters: dto.parameters,
        text: dto.text,
        projectId: dto.projectId,
        voiceUrl: dto.voiceUrl,
        userId: req.user.userId
      });
      return result;
    } catch (error) {
      throw new BadRequestException(error.message || '语音合成失败');
    }
  }

  // 项目语音合成
  @Post('/generate')
  @UseGuards(JwtAuthGuard)
  async generateProjectSounds(@Body() dto: GenerateProjectSoundsDto, @Req() req: any) {
    try {
      const result = await this.soundService.generateProjectSounds({
        voiceId: dto.voiceId,
        parameters: dto.parameters,
        segments: dto.segments,
        projectId: dto.projectId,
        voiceUrl: dto.voiceUrl,
        userId: req.user.userId
      });
      return result;
    } catch (error) {
      throw new BadRequestException(error.message || '项目语音合成失败');
    }
  }
}
