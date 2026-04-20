import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Material } from './material.entity';
import { MaterialService } from './material.service';
import { MaterialController } from './material.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Material])],
    providers: [MaterialService],
    controllers: [MaterialController],
})
export class MaterialModule { }