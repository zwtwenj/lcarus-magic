import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { Profile } from './profile.entity';
import { Logs } from '../logs/logs.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Logs)
    private readonly logsRepository: Repository<Logs>,
  ) {}

  findAll() {
    return this.userRepository.find();
  }
  find(username: string) {
    return this.userRepository.findOne({
      where: {
        username,
      },
    });
  }
  async create(user: User) {
    const userTmp = this.userRepository.create(user);
    return this.userRepository.save(userTmp);
  }
  update(id: number, user: Partial<User>) {
    return this.userRepository.update(id, user);
  }
  remove(id: number) {
    return this.userRepository.delete(id);
  }
  // // 查询用户信息
  // async findProfile(id: number): Promise<Profile | null> {
  //   const user = await this.userRepository.findOne({
  //     where: {
  //       id,
  //     },
  //     relations: ['profile'],
  //   });
  //   return user?.profile ?? null;
  // }
  // 查询用户日志
  async findUserLogs(id: number): Promise<Logs[]> {
    const user = await this.userRepository.findOne({
      where: {
        id,
      },
      relations: ['logs'],
    });
    return user?.logs ?? [];
  }

  // 查询用户日志分组
  async findUserLogsByGroup(id: number): Promise<any[]> {
    return this.logsRepository
      .createQueryBuilder('logs')
      .select('logs.result', 'result')
      .addSelect('COUNT("logs.result")', 'count')
      .leftJoinAndSelect('logs.user', 'users')
      .where('users.id = :id', { id })
      .groupBy('logs.result')
      .orderBy('result', 'DESC')
      .getRawMany();
  }
}
