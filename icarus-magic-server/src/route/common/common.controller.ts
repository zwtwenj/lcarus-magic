import { Controller, Post, UploadedFile, UseInterceptors, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CommonService } from './common.service';
import { Public } from '../../transform/public.decorator';

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

  @Public()
  @Post('test/cosyvoice')
  async testCosyvoice(@Body() dto: TestCosyvoiceDto) {
    const result = await this.commonService.testCosyvoice(
      dto.text,
      dto.voiceId,
      dto.url,
      dto.parameters
    );
    
    if (result.error) {
      return {
        success: false,
        message: result.error,
        data: result.data
      };
    }
    
    return {
      success: true,
      message: 'Cosyvoice test successful',
      data: result.data
    };
  }
}