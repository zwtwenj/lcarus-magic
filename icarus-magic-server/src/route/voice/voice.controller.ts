import { Controller, Post } from '@nestjs/common';
import { VoiceService } from './voice.service';

@Controller('voice')
export class VoiceController {
    constructor(private readonly voiceService: VoiceService) {}

    @Post('/list')
    async getVoiceList() {
        return await this.voiceService.getVoiceList();
    }
}