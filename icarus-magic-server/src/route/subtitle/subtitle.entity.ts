import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

@Entity('subtitle')
export class Subtitle {
  @PrimaryGeneratedColumn()
  id: number

  @Column({
    name: 'project_id',
    type: 'int',
    nullable: false
  })
  projectId: number

  @Column({
    name: 'type',
    type: 'varchar',
    length: 20,
    nullable: true,
    default: null
  })
  type: string | null

  @Column({
    name: 'url',
    type: 'varchar',
    length: 512,
    nullable: true
  })
  url: string

  @CreateDateColumn({
    name: 'created_at'
  })
  createdAt: Date
}