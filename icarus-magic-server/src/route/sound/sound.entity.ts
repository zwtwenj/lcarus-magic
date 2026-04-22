import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Voice } from '../voice/voice.entity';
import { Project } from '../project/project.entity';

@Entity('sound')
export class Sound {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  text: string;

  @Column({ length: 512 })
  url: string;

  // 音声id，voice表中的id，而不是voice表中的voiceId
  @Column()
  voiceId: number;

  @ManyToOne(() => Voice, (voice) => voice.id)
  @JoinColumn({ name: 'voiceId' })
  voice: Voice;

  @Column()
  projectId: number;

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'projectId' })
  project: Project;

  // 创建时间
  @CreateDateColumn()
  createdAt: Date;

  // 是否测试音
  @Column()
  isTest: boolean = true;

  // 时长（秒）
  @Column({ type: 'float', nullable: true })
  duration: number;
}
