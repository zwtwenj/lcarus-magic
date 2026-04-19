import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  ParseIntPipe,
  Logger,
} from '@nestjs/common';
import { UserService } from './user.service';
import { ConfigService } from '@nestjs/config';
import { User } from './user.entity';
import { DeleteResult } from 'typeorm';
import { Logs } from '../logs/logs.entity';
// import { Logger } from 'nestjs-pino';

@Controller('user')
export class UserController {
  private readonly logger = new Logger(UserController.name);
  
  constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {}

  @Get('/getAll')
  getUsers(): Promise<User[]> {
    return this.userService.findAll();
  }

  @Post('/addUser')
  addUser(@Body() userTmp: User): Promise<User> {
    return this.userService.create(userTmp);
  }

  @Post('/find')
  findUser(@Body('username') username: string): Promise<User | null> {
    return this.userService.find(username);
  }

  @Post('/remove')
  removeUser(@Body('id') id: number): Promise<DeleteResult> {
    return this.userService.remove(id);
  }

  @Get('/getLogs')
  getLogs(@Query('id', ParseIntPipe) id: number): Promise<Logs[]> {
    this.logger.log(`获取用户日志，用户ID: ${id}`)
    return this.userService.findUserLogs(id);
  }

  // @Get('/logsByGroup')
  // async getLogsByGroup(@Query('id', ParseIntPipe) id: number): Promise<{ result: string; count: number }[]>{
  //   const res = await this.userService.findUserLogsByGroup(id);
  //   this.logger.log(`获取用户日志分组统计，用户ID: ${id}`);
  //   const result = res.map((item) => ({
  //     result: item.result,
  //     count: item.count,
  //   }));
  //   this.logger.log(`用户ID: ${id} 的日志分组统计结果: ${JSON.stringify(result)}`);
  //   return result;
  // }
}
