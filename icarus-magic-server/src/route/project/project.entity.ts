import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from '../user/user.entity';

@Entity()
export class Project {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  description!: string;

  @Column()
  status!: string;

  @CreateDateColumn()
  createdAt!: Date;

  //   @Column()
  //   material!: string[];

  @ManyToOne(() => User, (user) => user.projects)
  user!: User;
}
