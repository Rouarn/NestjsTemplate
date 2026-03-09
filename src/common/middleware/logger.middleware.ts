import { CurrentUser } from '@/common/interfaces/current-user.interface';
import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { ParsedQs } from 'qs';
import type { Logger } from 'winston';

// 扩展 Express 的 Request 接口，以包含自定义属性
interface AppRequest extends Request {
  user?: CurrentUser;
  requestId?: string;
}

// 定义日志数据的接口
interface LogData {
  requestId: string;
  method: string;
  url: string;
  query: ParsedQs;
  ip: string;
  statusCode: number;
  responseTime: string;
  user?: {
    userId: string;
    username: string;
  };
}

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  use(req: AppRequest, res: Response, next: NextFunction): void {
    const { method, originalUrl, query, ip = '' } = req;
    const startTime = Date.now();
    const requestId = randomUUID();

    // 将 requestId 附加到请求对象，以便在其他地方（如拦截器）访问
    req.requestId = requestId;

    res.on('finish', () => {
      const { statusCode } = res;
      const responseTime = Date.now() - startTime;

      const logData: LogData = {
        requestId,
        method,
        url: originalUrl,
        query,
        ip,
        statusCode,
        responseTime: `${responseTime}ms`,
      };

      // 如果解析出用户信息，则添加到日志中
      if (req.user) {
        logData.user = {
          userId: req.user.userId,
          username: req.user.username,
        };
      }

      this.logger.info('ApiRequest', logData);
    });

    next();
  }
}
