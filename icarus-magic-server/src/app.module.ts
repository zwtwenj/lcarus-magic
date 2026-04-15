import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';
import { User } from './route/user/user.entity';
import { Roles } from './route/roles/roles.entity';
import { Logs } from './route/logs/logs.entity';
import { Task } from './route/task/task.entity';
import { Project } from './route/project/project.entity';
import { AuthModule } from './route/auth/auth.module'
import { UserModule } from './route/user/user.module';
import { LogsModule } from './route/logs/logs.module';
import { TaskModule } from './route/task/task.module';
import { ProjectModule } from './route/project/project.module';

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
        entities: [User, Roles, Logs, Task, Project],
        synchronize: true,
        logging: ['error', 'warn'],
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UserModule,
    LogsModule,
    TaskModule,
    ProjectModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
