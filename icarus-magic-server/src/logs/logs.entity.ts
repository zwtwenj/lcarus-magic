import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from '../user/user.entity';

@Entity()
export class Logs {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  path!: string;

  @Column()
  method!: string;

  @Column()
  data!: string;

  @Column()
  result!: string;

  @ManyToOne(() => User, (user) => user.logs)
  user!: User;
}
