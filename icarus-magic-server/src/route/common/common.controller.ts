import { Controller, Post, UploadedFile, UseInterceptors, Body, UseGuards, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CommonService } from './common.service';
import { JwtAuthGuard } from '../../transform/jwt-auth.guard';
// import { Error}

interface TestCosyvoiceDto {
  voiceId?: string;
  url?: string;
  text: string;
  parameters?: Record<string, any>;
}

@Controller('common')
export class CommonController {
  constructor(private readonly commonService: CommonService) {}

  @Post('upload/material')
  @UseInterceptors(FileInterceptor('file'))
  async uploadMaterial(@UploadedFile() file: any) {
    if (!file) {
      return { error: 'No file uploaded' };
    }
    const url = await this.commonService.uploadMaterial(file);
    return { url };
  }

  @Post('upload/sound')
  @UseInterceptors(FileInterceptor('file'))
  async uploadSound(@UploadedFile() file: any) {
    if (!file) {
      return { error: 'No file uploaded' };
    }
    const url = await this.commonService.uploadSound(file);
    return { url };
  }

  @Post('test/cosyvoice')
  @UseGuards(JwtAuthGuard)
  async testCosyvoice(@Body() dto: TestCosyvoiceDto, @Req() req: any) {
    const result = await this.commonService.testCosyvoice({
      userId: req.user.userId,
      text: dto.text,
      voiceId: dto.voiceId,
      url: dto.url,
      parameters: dto.parameters,
    });
    
    if (result.error) {
      return new Error(result.error);
    }
    
    return {
      taskId: result.taskId
    };
  }
}