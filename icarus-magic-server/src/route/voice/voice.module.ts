import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Voice } from './voice.entity';
import { VoiceService } from './voice.service';
import { VoiceController } from './voice.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Voice])],
    controllers: [VoiceController],
    providers: [VoiceService],
    exports: [VoiceService],
})
export class VoiceModule {}