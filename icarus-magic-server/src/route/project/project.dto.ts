import { IsDefined, IsNotEmpty, IsString, IsOptional, Min, IsInt } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * 创建项目 DTO
 * @param name 项目名称
 * @param description 项目描述
 * @param userId 用户ID
 */
export class CreateProjectDto {
    @IsDefined()
    @IsNotEmpty()
    @IsString()
    name: string;
    
    @IsDefined()
    @IsNotEmpty()
    @IsString()
    description: string;

    @IsDefined()
    @IsNotEmpty()
    @IsString()
    userId: string;
}

/**
 * 查询项目列表 DTO
 * @param page 页码
 * @param page_size 每页数量
 * @param userId 用户ID
 */
export class ListDto {
    @IsOptional()
    @IsInt()
    @Min(1)
    @Transform(({ value }) => parseInt(value) || 1) 
    page: number = 1;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Transform(({ value }) => parseInt(value) || 10) 
    page_size: number = 10;
    
    @IsOptional()
    @IsString()
    @Transform(({ value }) => value || '') 
    userId: string = '';
}

/**
 * 文案润色 DTO
 * @param text 待润色的文本
 */
export class PolishTextDto {
    @IsDefined()
    @IsNotEmpty()
    @IsString()
    text: string;
}

/**
 * 保存文案 DTO
 * @param projectId 项目ID
 * @param text 文案内容
 */
export class SaveTextDto {
    @IsDefined()
    @IsNotEmpty()
    @IsInt()
    projectId: number;

    @IsDefined()
    @IsNotEmpty()
    @IsString()
    text: string;
}