import { Module } from '@nestjs/common';
import { WinstonModule, WinstonModuleOptions } from 'nest-winston';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import { utilities } from 'nest-winston';
import { Console } from 'winston/lib/winston/transports';
import DailyRotateFile from 'winston-daily-rotate-file';

const consoleTransports = new Console({
    level: 'info',
    format: winston.format.combine(
        winston.format.colorize(),
        utilities.format.nestLike()
    ),
});

const dailyWarnTransports = new DailyRotateFile({
    level: 'warn',
    dirname: 'logs',
    filename: 'warn-%DATE%.log',
    datePattern: 'YYYY-MM-DD-HH',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.simple()
    ),
});

const dailyErrorTransports = new DailyRotateFile({
    level: 'error',
    dirname: 'logs',
    filename: 'error-%DATE%.log',
    datePattern: 'YYYY-MM-DD-HH',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.simple()
    ),
});

const dailyInfoTransports = new DailyRotateFile({
    level: 'info',
    dirname: 'logs',
    filename: 'info-%DATE%.log',
    datePattern: 'YYYY-MM-DD-HH',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.simple()
    ),
});

@Module({
    imports: [
        WinstonModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                transports: [
                    consoleTransports,
                    configService.get('LOG_ON') ? dailyWarnTransports : null,
                    configService.get('LOG_ON') ? dailyErrorTransports : null,
                    configService.get('LOG_ON') ? dailyInfoTransports : null,
                ],
            } as WinstonModuleOptions),
        })
    ],
})
export class LogsModule {}
