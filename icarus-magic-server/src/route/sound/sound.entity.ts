import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
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

  @Column()
  voiceId: number;

  @ManyToOne(() => Voice, (voice) => voice.id)
  @JoinColumn({ name: 'voiceId' })
  voice: Voice;

  @Column()
  projectId: number;

  @ManyToOne(() => Project, (project) => project.id)
  @JoinColumn({ name: 'projectId' })
  project: Project;
}
