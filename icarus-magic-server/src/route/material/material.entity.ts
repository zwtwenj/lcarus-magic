import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Project } from '../project/project.entity';
import { User } from '../user/user.entity';

@Entity('material')
export class Material {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: ['image', 'video', 'voice'],
    nullable: false
  })
  type: 'image' | 'video' | 'voice';

  @Column('text')
  name: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true
  })
  fileSize: string;

  @Column('simple-array', {
    nullable: true
  })
  tags: string[];

  @Column({
    length: 512,
    nullable: false
  })
  url: string;

  @Column()
  projectId: number;

  @ManyToOne(() => Project)
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column()
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}