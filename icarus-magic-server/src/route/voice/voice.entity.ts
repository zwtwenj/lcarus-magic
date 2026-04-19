import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from '../user/user.entity';
import { Sound } from '../sound/sound.entity';

@Entity('voice')
export class Voice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  // 语音URL用户自己上传的会有url
  @Column({ length: 512 })
  url: string;

  @ManyToOne(() => User, (user) => user.voices)
  @JoinColumn()
  user: User;

  // 百炼的默认音色Id
  @Column()
  voiceId: string;

  @CreateDateColumn()
  createdAt: Date;
}
