import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('subtitle')
export class Subtitle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'project_id',
    type: 'int',
    nullable: false
  })
  projectId: number;

  @Column({
    type: 'varchar',
    length: 512,
    nullable: true
  })
  url: string;

  @CreateDateColumn()
  createdAt: Date;
}