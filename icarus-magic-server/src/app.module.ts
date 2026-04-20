import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';
import { User } from './route/user/user.entity';
import { Roles } from './route/roles/roles.entity';
import { Logs } from './route/logs/logs.entity';
import { Task } from './route/task/task.entity';
import { Project } from './route/project/project.entity';
import { Coze } from './route/coze/coze.entity';
import { Config } from './route/common/config.entity';
import { Voice } from './route/voice/voice.entity';
import { Sound } from './route/sound/sound.entity';
import { AuthModule } from './route/auth/auth.module'
import { UserModule } from './route/user/user.module';
import { LogsModule } from './route/logs/logs.module';
import { TaskModule } from './route/task/task.module';
import { ProjectModule } from './route/project/project.module';
import { CozeModule } from './route/coze/coze.module';
import { VoiceModule } from './route/voice/voice.module';
import { CommonModule } from './route/common/common.module';
import { SoundModule } from './route/sound/sound.module';

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
        entities: [User, Roles, Logs, Task, Project, Coze, Config, Voice, Sound],
        synchronize: false,
        logging: ['error', 'warn'],
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UserModule,
    LogsModule,
    TaskModule,
    ProjectModule,
    CozeModule,
    VoiceModule,
    CommonModule,
    SoundModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
