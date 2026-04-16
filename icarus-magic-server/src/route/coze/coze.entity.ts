import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

// 工作流类型枚举
export enum WorkflowType {
  POLISH = 'polish',
  // 可以在这里添加其他工作流类型
}

/**
 * Coze 工作流记录实体
 */
@Entity('coze')
export class Coze {
  @PrimaryGeneratedColumn()
  id: number;

  /**
   * 用户ID
   */
  @Column({ nullable: true })
  userId: number;

  /**
   * 用户请求参数（JSON 字符串）
   */
  @Column({ type: 'text' })
  req: string;

  /**
   * 工作流返回结果（原始响应字符串）
   */
  @Column({ type: 'text' })
  res: string;

  /**
   * 工作流运行 ID
   */
  @Column()
  runId: string;

  /**
   * 工作流执行时间（秒）
   */
  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  time: number;

  /**
   * 工作流类型
   */
  @Column({ type: 'enum', enum: WorkflowType })
  type: WorkflowType;

  /**
   * 创建时间
   */
  @CreateDateColumn()
  createdAt: Date;
}
