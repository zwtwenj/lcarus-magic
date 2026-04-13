import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '@/route/user/user.entity';
import { TaskStatus } from './task.dto';

@Entity()
export class Task {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column()
  status!: TaskStatus;
  
  @Column()
  // enum: 任务类型 project subtitle sound material
  type!: string;

  @Column()
  create_time!: Date;

  @ManyToOne(() => User, (user) => user.tasks)
  @JoinColumn()
  user!: User;
  
//   @Column()
//   gender!: number;

//   @Column()
//   photo!: string;

//   @OneToOne(() => User, (user) => user.profile)
//   @JoinColumn()
//   user!: User;
}
