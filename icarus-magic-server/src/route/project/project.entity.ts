import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
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

//   @Column()
//   material!: string[];

  @ManyToOne(() => User, (user) => user.projects)
  user!: User;
}
