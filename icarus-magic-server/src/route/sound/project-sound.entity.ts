import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Project } from '../project/project.entity';

@Entity('project_sound')
export class ProjectSound {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  projectId: number;

  @ManyToOne(() => Project, (project) => project.projectSound)
  @JoinColumn({ name: 'projectId' })
  project: Project;

  // 无序的sound id列表，用于存储项目中的所有sound
  @Column({ type: 'json' })
  soundIds: number[];

  // 有序的sound id列表，用于存储项目中的sound顺序
  @Column({ type: 'json' })
  sortOrders: number[];
}
