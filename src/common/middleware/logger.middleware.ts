import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl, query, body, ip } = req;
    const startTime = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const responseTime = Date.now() - startTime;

      const message = `${method} ${originalUrl} ${statusCode} - ${responseTime}ms`;

      const logData = {
        method,
        url: originalUrl,
        query,
        body,
        ip,
        statusCode,
        responseTime,
      };

      // 统一使用 info 级别记录访问日志，避免与 ExceptionFilter 的错误日志重复
      // 错误详情由 HttpExceptionFilter 记录到 error/warn 日志中
      this.logger.info(message, logData);
    });

    next();
  }
}
