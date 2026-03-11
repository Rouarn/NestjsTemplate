import { CurrentUser } from '@/common/interfaces/current-user.interface';
import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Logger } from 'winston';

// 扩展 Express 的 Request 接口，以包含自定义属性
interface AppRequest extends Request {
  user?: CurrentUser;
  requestId?: string;
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

    // 1. 打印 "请求入口" (立即执行)
    this.logger.info('');
    this.logger.info('┌─ 🚀 请求入口 ───────────────────────────────────────────────────┐');
    this.logger.info(`│ 🆔 请求 ID: ${requestId}`);
    this.logger.info(`│ 🚀 请求方法: ${method}`);
    this.logger.info(`│ 🔗 请求路由: ${originalUrl}`);
    const queryStr = JSON.stringify(query, null, 2);
    const hasQuery = queryStr && queryStr !== '{}';
    this.logger.info(`│ ❓ 请求参数: ${hasQuery ? '' : '无'}`);
    if (hasQuery) {
      queryStr.split('\n').forEach((line) => {
        this.logger.info(`│    ${line}`);
      });
    }
    this.logger.info(`│ 💻 客户端 IP: ${ip}`);

    if (req.user) {
      this.logger.info('├─ 👤 用户信息 ───────────────────────────────────────────────────┤');
      this.logger.info(`│ 🆔 用户 ID: ${req.user.userId}`);
      this.logger.info(`│ 👤 用户名: ${req.user.username}`);
    }
    this.logger.info('└─────────────────────────────────────────────────────────────────┘');

    res.on('finish', () => {
      const { statusCode } = res;
      const responseTime = Date.now() - startTime;

      // 2. 打印“请求完成” (响应结束后执行)
      this.logger.info('');
      this.logger.info('┌─ ✅ 请求完成 ───────────────────────────────────────────────────┐');
      this.logger.info(`│ 🆔 请求 ID: ${requestId}`);
      this.logger.info(`│ ✅ 状态码: ${statusCode}`);
      this.logger.info(`│ ⏱️  响应耗时: ${responseTime}ms`);
      this.logger.info('└─────────────────────────────────────────────────────────────────┘');
      this.logger.info('');
    });

    next();
  }
}
