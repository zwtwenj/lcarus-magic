import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/route/user/user.entity';
import { LoginDto } from './auth.dto';
import { UnauthorizedException } from '@nestjs/common/exceptions';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
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
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 生成 JWT 令牌
    const payload = { sub: user.id, username: user.username };
    const token = this.jwtService.sign(payload);

    return {
      user: {
        id: user.id,
        username: user.username
      },
      access_token: token,
    };
  }
}
