import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PolishTextDto } from './coze.dto';
import { Coze, WorkflowType } from './coze.entity';
import { callCozePolishWorkflow } from '../../model/coze';

@Injectable()
export class CozeService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Coze)
    private readonly cozeRepository: Repository<Coze>
  ) {}

  // 文案润色
  async polishText(dto: PolishTextDto, userId: number): Promise<string> {
    const { originalText, styleType, polishIntensity } = dto;
    const response = await callCozePolishWorkflow(originalText, styleType, polishIntensity, this.configService);
    
    // 解析响应数据
    const data = JSON.parse(response);

    // 保存到数据库
    const cozeRecord = this.cozeRepository.create({
      userId,
      req: JSON.stringify(dto),
      res: response,
      runId: data.run_id,
      time: data.time,
      type: WorkflowType.POLISH
    });
    await this.cozeRepository.save(cozeRecord);
    
    return data.polished_text;
  }
}
