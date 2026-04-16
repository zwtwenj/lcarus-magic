import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from '../user/user.entity';

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
  user!: User;
}
