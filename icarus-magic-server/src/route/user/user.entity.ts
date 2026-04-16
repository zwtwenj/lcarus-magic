import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  ManyToMany,
  JoinTable,
  OneToOne,
} from 'typeorm';
import { Logs } from '../logs/logs.entity';
import { Task } from '@/route/task/task.entity';
import { Project } from '@/route/project/project.entity';
import { Voice } from '../voice/voice.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  username!: string;

  @Column()
  password!: string;

  @OneToMany(() => Logs, (logs) => logs.user)
  logs!: Logs[];

  @OneToMany(() => Task, (task) => task.user)
  tasks!: Task[];

  @OneToMany(() => Project, (project) => project.user)
  projects!: Project[];

  @OneToMany(() => Voice, (voice) => voice.user)
  voices!: Voice[];

  // @ManyToMany(() => Roles, (roles) => roles.users)
  // @JoinTable()
  // roles!: Roles[];

  // @OneToOne(() => Profile, (profile) => profile.user)
  // profile!: Profile;
}
