import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { Logs } from '../logs/logs.entity';
import { Roles } from '../roles/roles.entity';

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    username: string;

    @Column()
    password: string;

    @OneToMany(() => Logs, (logs) => logs.user)
    logs: Logs[];

    @ManyToMany(() => Roles, (roles) => roles.users)
    @JoinTable()
    roles: Roles[];
}
