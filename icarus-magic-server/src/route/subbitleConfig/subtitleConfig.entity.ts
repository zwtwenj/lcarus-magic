import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('subtitle_config')
export class SubtitleConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text' })
  config: string;

  @Column({ type: 'text' })
  assStr: string;

  @Column()
  userId: number;

  @CreateDateColumn()
  createdAt: Date;
}