import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('video')
export class Video {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'task_id',
    nullable: true
  })
  taskId: string;

  @Column({
    type: 'varchar',
    length: 512,
    nullable: true
  })
  url: string;

  @Column({
    type: 'json',
    nullable: true
  })
  parameters: any;

  @Column({
    name: 'voice_id',
    nullable: true
  })
  voiceId: string;

  @Column({
    type: 'json',
    nullable: true
  })
  materials: string[];

  @Column({
    type: 'json',
    nullable: true
  })
  segments: any[];

  @CreateDateColumn()
  createdAt: Date;
}