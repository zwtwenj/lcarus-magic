import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, JoinColumn } from 'typeorm';
import { User } from '../user/user.entity';
import { Sound } from '../sound/sound.entity';
import { ProjectSound } from '../sound/project-sound.entity';

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

  // 文案
  @Column({ type: 'text' })
  text!: string;

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
