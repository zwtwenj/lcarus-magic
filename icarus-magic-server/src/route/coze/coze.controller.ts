import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../transform/jwt-auth.guard';
import { CozeService } from './coze.service';
import { PolishTextDto } from './coze.dto';

@Controller('coze')
export class CozeController {
  constructor(private readonly cozeService: CozeService) {}

  // 文案润色
  @Post('/polish')
  @UseGuards(JwtAuthGuard)
  async polishText(@Body() dto: PolishTextDto, @Req() req: any) {
    return await this.cozeService.polishText(dto, req.user.userId);
  }
}
