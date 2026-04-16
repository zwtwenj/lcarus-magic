import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CozeService } from './coze.service';
import { CozeController } from './coze.controller';
import { Coze } from './coze.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Coze])],
    controllers: [CozeController],
    providers: [CozeService],
})
export class CozeModule { }
