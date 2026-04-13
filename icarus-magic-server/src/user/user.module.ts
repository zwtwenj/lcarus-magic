import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Logs } from '../logs/logs.entity';
import { LoggerModule } from 'nestjs-pino';

@Module({
  imports: [TypeOrmModule.forFeature([User, Logs]),
  LoggerModule.forRoot({
    pinoHttp: {
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
        }
      }
    },
  })],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}