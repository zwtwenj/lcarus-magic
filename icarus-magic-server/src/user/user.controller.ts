import { Controller, Get, Post, Put, Delete, Body } from '@nestjs/common';
import { UserService } from './user.service';
import { ConfigService } from '@nestjs/config';
import { User } from './user.entity';

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {}

  @Get('getAll')
  getUsers(): Promise<User[]> {
    return this.userService.findAll();
  }

  @Post('addUser')
  addUser(@Body() userTmp: User): Promise<User> {
    return this.userService.create(userTmp);
  }

  @Post('find')
  findUser(@Body('username') username: string): Promise<User | null> {
    return this.userService.find(username);
  }
}
