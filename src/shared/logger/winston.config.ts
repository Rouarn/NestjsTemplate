import type { AppConfigService } from '@/config';
import type { WinstonModuleOptions } from 'nest-winston';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

export const createWinstonConfig = (configService: AppConfigService): WinstonModuleOptions => {
  const loggerOptions = configService.loggerOptions;

  const createDailyRotateTransport = (level: string, filename: string): DailyRotateFile => {
    return new DailyRotateFile({
      level: level,
      dirname: loggerOptions.dir,
      filename: `${filename}-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: loggerOptions.maxSize,
      maxFiles: loggerOptions.maxFiles,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
        winston.format((info) => {
          return info.level === level ? info : false;
        })(),
      ),
    });
  };

  // 显式声明类型为 winston.transport[] 以支持不同类型的 Transport
  const transports: winston.transport[] = [
    createDailyRotateTransport('error', 'error'),
    createDailyRotateTransport('warn', 'warn'),
    createDailyRotateTransport('info', 'info'),
    createDailyRotateTransport('debug', 'debug'),
  ];

  // 在非线上环境下启用控制台输出
  if (!configService.isProduction) {
    transports.push(
      new winston.transports.Console({
        level: loggerOptions.level,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.ms(),
          nestWinstonModuleUtilities.format.nestLike('NestApp', {
            colors: true,
            prettyPrint: true,
          }),
        ),
      }),
    );
  }

  return {
    level: loggerOptions.level,
    transports,
  };
};
