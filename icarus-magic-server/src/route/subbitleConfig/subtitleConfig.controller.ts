import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  ParseIntPipe
} from '@nestjs/common';
import { JwtAuthGuard } from '../../transform/jwt-auth.guard';
import { SubtitleConfigService } from './subtitleConfig.service';

@Controller('subtitle-config')
@UseGuards(JwtAuthGuard)
export class SubtitleConfigController {
  constructor(private readonly subtitleConfigService: SubtitleConfigService) {}

  // 保存字幕配置
  @Post('/save')
  async save(@Body('name') name: string, @Body('config') config: string, @Req() req: any) {
    const configData = JSON.parse(config);
    return await this.subtitleConfigService.saveConfig(name, configData, req.user.userId);
  }

  // 获取字幕配置列表
  @Post('/list')
  async list(@Req() req: any) {
    return await this.subtitleConfigService.findAllByUserId(req.user.userId);
  }

  // 删除字幕配置
  @Post('/delete')
  async delete(@Body('id') id: number, @Req() req: any) {
    return await this.subtitleConfigService.delete(id, req.user.userId);
  }
}