import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Logger } from 'winston';

// 扩展 Express 的 Request 接口，以包含自定义属性
interface AppRequest extends Request {
  requestId?: string;
  startTime?: number;
}

/** 上游透传请求 ID 的请求头 */
const TRACE_ID_HEADER = 'x-request-id';
/** 上游请求 ID 的合法格式：限制字符与长度，防止伪造超长内容或日志注入 */
const TRACE_ID_PATTERN = /^[\w-]{1,256}$/;

/**
 * 请求日志中间件
 *
 * 职责边界（与其他组件的分工）：
 * - 本中间件仅负责「请求入口」：解析/生成 requestId、记录开始时间、打印入口日志
 * - 请求的「出口日志」按结果分别处理：
 *   - 成功响应由 LoggingInterceptor 记录（状态码、耗时、响应数据、用户信息）
 *   - 异常响应由 AllExceptionsFilter 记录（含 Guard/Pipe 阶段抛出、不经过拦截器的异常）
 *
 * 注意：中间件执行在 Guard 之前，此时 req.user 尚未由 JwtAuthGuard 注入，
 * 因此用户信息只能在拦截器/过滤器中记录，不能在本中间件读取。
 */
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  use(req: AppRequest, res: Response, next: NextFunction): void {
    const { method, originalUrl, query, ip = '' } = req;

    // 优先复用上游（网关/负载均衡）透传的请求 ID，缺失或不合法时自行生成，
    // 保证跨服务链路可串联；并通过 X-Request-Id 响应头原样回传，便于客户端报障关联
    const requestId = this.resolveRequestId(req);
    req.requestId = requestId;
    req.startTime = Date.now();
    res.setHeader('X-Request-Id', requestId);

    // 打印 "请求入口" (立即执行)
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
    this.logger.info('└─────────────────────────────────────────────────────────────────┘');

    next();
  }

  /**
   * 解析请求 ID：优先采用上游 X-Request-Id，校验不通过时生成新的 UUID
   * @param req Express 请求对象
   * @returns 可安全用于日志的请求 ID
   */
  private resolveRequestId(req: Request): string {
    const upstreamId = req.headers[TRACE_ID_HEADER];
    const candidate = Array.isArray(upstreamId) ? upstreamId[0] : upstreamId;
    if (candidate && TRACE_ID_PATTERN.test(candidate)) {
      return candidate;
    }
    return randomUUID();
  }
}
