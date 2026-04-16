import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('config')
export class Config {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 255 })
  key: string;

  @Column({ type: 'text' })
  value: string;
}
