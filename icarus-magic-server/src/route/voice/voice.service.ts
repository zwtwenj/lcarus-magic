import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Voice } from './voice.entity';

@Injectable()
export class VoiceService {
    constructor(
        @InjectRepository(Voice)
        private voiceRepository: Repository<Voice>,
    ) {}

    async getVoiceList(): Promise<Voice[]> {
        return this.voiceRepository.find({
            order: { createdAt: 'DESC' },
        });
    }
}