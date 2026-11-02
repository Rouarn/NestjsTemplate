import type { AppConfigService } from '../../config/index.js';
import type { WinstonModuleOptions } from 'nest-winston';
import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

/**
 * Winston 配置
 *
 * 设计取舍：
 * - 生产/测试环境只写文件（JSON，单行），开发环境额外输出彩色控制台；
 * - 只保留两个文件流（全量 + error），不再为每个级别各开一个 handle；
 * - 统一 `format.errors({ stack: true })`，异常堆栈不会丢；
 * - 业务字段由调用方以结构化对象传入（见 LoggingInterceptor），不做字符串拼接。
 */
export const createWinstonConfig = (configService: AppConfigService): WinstonModuleOptions => {
  const { level, dir, maxFiles, maxSize } = configService.loggerOptions;

  const fileFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  );

  const createFileTransport = (filename: string, transportLevel: string): DailyRotateFile =>
    new DailyRotateFile({
      level: transportLevel,
      dirname: dir,
      filename: `${filename}-%DATE%.log`,
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize,
      maxFiles,
      format: fileFormat,
    });

  const transports: winston.transport[] = [
    // 全量日志
    createFileTransport('app', level),
    // 错误日志单独留存，便于告警采集（同时也会写入 app-*.log）
    createFileTransport('error', 'error'),
  ];

  if (!configService.isProduction) {
    transports.push(
      new winston.transports.Console({
        level,
        format: winston.format.combine(
          winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
          winston.format.errors({ stack: true }),
          nestWinstonModuleUtilities.format.nestLike('NestApp', {
            colors: true,
            prettyPrint: true,
          }),
        ),
      }),
    );
  }

  return { level, transports };
};
