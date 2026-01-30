import type { AppConfigService } from '@/config';
import type { WinstonModuleOptions } from 'nest-winston';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

export const createWinstonConfig = (configService: AppConfigService): WinstonModuleOptions => {
  const loggerOptions = configService.loggerOptions;

  // 错误日志 Transport
  const errorTransport = new winston.transports.DailyRotateFile({
    level: 'error',
    dirname: loggerOptions.dir,
    filename: 'error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: loggerOptions.maxSize,
    maxFiles: loggerOptions.maxFiles,
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  });

  // 综合日志 Transport (排除 error 级别)
  const combinedTransport = new winston.transports.DailyRotateFile({
    level: 'info', // 记录 info 及以上 (warn, error)
    dirname: loggerOptions.dir,
    filename: 'combined-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: loggerOptions.maxSize,
    maxFiles: loggerOptions.maxFiles,
    format: winston.format.combine(
      // 过滤掉 error 级别的日志，防止与 error.log 重复
      winston.format((info) => {
        if (info.level === 'error') {
          return false;
        }
        return info;
      })(),
      winston.format.timestamp(),
      winston.format.json(),
    ),
  });

  return {
    level: loggerOptions.level,
    transports: [
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
      errorTransport,
      combinedTransport,
    ],
  };
};
