import { Controller, Post, Get, UploadedFile, UseInterceptors, Body, UseGuards, Req, BadRequestException, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SubtitleService } from './subtitle.service';
import { JwtAuthGuard } from '../../transform/jwt-auth.guard';

interface UploadSubtitleDto {
  projectId: number;
}

@Controller('subtitle')
export class SubtitleController {
  constructor(private readonly subtitleService: SubtitleService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadSubtitle(@UploadedFile() file: any, @Body() body: UploadSubtitleDto) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    if (!body.projectId) {
      throw new BadRequestException('projectId is required');
    }
    const subtitle = await this.subtitleService.uploadSubtitle(file, body.projectId);
    return { success: true, subtitle };
  }

  @Get('list')
  @UseGuards(JwtAuthGuard)
  async getSubtitleList(@Query('projectId') projectId: string) {
    if (!projectId) {
      throw new BadRequestException('projectId is required');
    }
    const list = await this.subtitleService.getSubtitleListByProjectId(parseInt(projectId, 10));
    return { success: true, list };
  }
}