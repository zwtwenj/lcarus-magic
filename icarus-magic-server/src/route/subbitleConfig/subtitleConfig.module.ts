import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubtitleConfigService } from './subtitleConfig.service';
import { SubtitleConfigController } from './subtitleConfig.controller';
import { SubtitleConfig } from './subtitleConfig.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SubtitleConfig])],
  controllers: [SubtitleConfigController],
  providers: [SubtitleConfigService],
})
export class SubtitleConfigModule {}