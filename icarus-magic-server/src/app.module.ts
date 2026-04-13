import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';
import { User } from './user/user.entity';
import { Profile } from './user/profile.entity';
import { Roles } from './roles/roles.entity';
import { Logs } from './logs/logs.entity';
import { Task } from './task/task.entity';
import { AuthModule } from './auth/auth.module'
import { UserModule } from './user/user.module';
import { LogsModule } from './logs/logs.module';
import { TaskModule } from './task/task.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('MYSQL_ADDRESS'),
        port: configService.get('MYSQL_PORT'),
        username: configService.get('MYSQL_USER'),
        password: configService.get('MYSQL_PASSWORD'),
        database: configService.get('MYSQL_DATABASE'),
        entities: [User, Profile, Roles, Logs, Task],
        synchronize: true,
        logging: ['error', 'warn'],
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UserModule,
    LogsModule,
    TaskModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
