import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/user/user.entity';
import { LoginDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // 登录
  async login(dto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: {
        username: dto.username,
        password: dto.password,
      },
    });
    if (!user) {
      return {
        code: 400,
        msg: '用户名或密码错误',
      }
    }
    return user;
  }
}
