import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';
import { User } from './user/user.entity';
import { Profile } from './user/profile.entity';
import { Roles } from './roles/roles.entity';
import { Logs } from './logs/logs.entity';


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
        entities: [User, Profile, Roles, Logs],
        synchronize: true,
        logging: true
      }),
      inject: [ConfigService],
    })
    //   host: configService.get('MYSQL_HOST'),
    //   port: configService.get('MYSQL_PORT'),
    //   username: configService.get('MYSQL_USER'),
    //   password: configService.get('MYSQL_PASSWORD'),
    //   database: configService.get('MYSQL_DATABASE'),
    //   entities: [],
    //   synchronize: true,
    // })
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
