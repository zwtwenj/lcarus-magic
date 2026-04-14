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
import { Roles } from '../roles/roles.entity';
import { Profile } from './profile.entity';
import { Task } from '@/route/task/task.entity';
import { Project } from '@/route/project/project.entity';

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

  // @ManyToMany(() => Roles, (roles) => roles.users)
  // @JoinTable()
  // roles!: Roles[];

  // @OneToOne(() => Profile, (profile) => profile.user)
  // profile!: Profile;
}
