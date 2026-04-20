import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, JoinColumn } from 'typeorm';
import { User } from '../user/user.entity';
import type { VoiceParameters } from '../sound/sound.dto';

// 段落接口
export interface Segment {
  sort: number;
  text: string;
  sound: string | null;
}

@Entity()
export class Project {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column()
  status!: string;

  @CreateDateColumn()
  createdAt!: Date;

  // 段落
  @Column({ type: 'json', nullable: true })
  segments?: Segment[];

  // 音声ID
  @Column({ nullable: true })
  voiceId?: string;

  // 音声配置
  @Column({ type: 'json', nullable: true })
  parameters?: VoiceParameters;

  //   @Column()
  //   material!: string[];

  @ManyToOne(() => User, (user) => user.projects)
  @JoinColumn()
  user!: User;

}
