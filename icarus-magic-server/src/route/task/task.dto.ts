import { IsNotEmpty, IsString, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { Transform } from 'class-transformer';

// 待处理 处理中 已完成
export enum TaskStatus {
    pending = 'pending',
    processing = 'processing',
    completed = 'completed',
}

/**
 * 任务DTO
 * @param user_id 用户ID 必填
 * @param type 任务类型 非必填
 * @param page 页码 非必填
 * @param page_size 每页数量 非必填
 * 
 * @param title 任务标题 非必填
 * @param status 任务状态 非必填
 */
export class TaskDto {
  @IsNotEmpty()
  @IsString()
  userId: string;

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
  title: string = '';

  @IsOptional()
  @IsString()
  type: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status: TaskStatus;
}
