import { Controller, Get, Query } from '@nestjs/common';
import { SoundService } from './sound.service';

@Controller('sound')
export class SoundController {
  constructor(private readonly soundService: SoundService) {}
}
