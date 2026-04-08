import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { UserService } from './user.service';
import { ConfigService } from '@nestjs/config';
import { User } from './user.entity';
import { DeleteResult } from 'typeorm';
import { Profile } from './profile.entity';
import { Logs } from '../logs/logs.entity';

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

  @Post('remove')
  removeUser(@Body('id') id: number): Promise<DeleteResult> {
    return this.userService.remove(id);
  }

  @Get('getProfile')
  getProfile(@Query('id', ParseIntPipe) id: number): Promise<Profile | null> {
    return this.userService.findProfile(id);
  }

  @Get('getLogs')
  getLogs(@Query('id', ParseIntPipe) id: number): Promise<Logs[]> {
    return this.userService.findUserLogs(id);
  }

  // @Get('/logsByGroup')
}
