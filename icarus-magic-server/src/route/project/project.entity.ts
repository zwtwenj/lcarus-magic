import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, JoinColumn } from 'typeorm';
import { User } from '../user/user.entity';
import { Sound } from '../sound/sound.entity';
import { ProjectSound } from '../sound/project-sound.entity';

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

  //   @Column()
  //   material!: string[];

  @ManyToOne(() => User, (user) => user.projects)
  @JoinColumn()
  user!: User;

  @OneToMany(() => Sound, (sound) => sound.project)
  sounds!: Sound[];

  @OneToMany(() => ProjectSound, (projectSound) => projectSound.project)
  projectSound!: ProjectSound[];
}
