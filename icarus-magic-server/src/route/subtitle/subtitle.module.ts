import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubtitleController } from './subtitle.controller';
import { SubtitleService } from './subtitle.service';
import { Subtitle } from './subtitle.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Subtitle])],
  controllers: [SubtitleController],
  providers: [SubtitleService],
})
export class SubtitleModule {}