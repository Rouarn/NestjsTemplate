import type { AppRequest } from '../interfaces/index.js';
import type { NestMiddleware } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { NextFunction, Response } from 'express';

/** 上游透传请求 ID 的请求头 */
const TRACE_ID_HEADER = 'x-request-id';
/** 上游请求 ID 的合法格式：限制字符与长度，防止伪造超长内容或日志注入 */
const TRACE_ID_PATTERN = /^[\w-]{1,256}$/;

/**
 * 请求上下文中间件
 *
 * 只做三件事：解析/生成 requestId、记录开始时间、回写 `X-Request-Id` 响应头。
 * **不打印任何日志** —— 访问日志统一由 `LoggingInterceptor`（成功）与
 * `AllExceptionsFilter`（失败）各输出一条结构化记录，避免同一请求出现多份日志。
 */
@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: AppRequest, res: Response, next: NextFunction): void {
    const requestId = this.resolveRequestId(req);

    req.requestId = requestId;
    req.startTime = Date.now();
    res.setHeader('X-Request-Id', requestId);

    next();
  }

  /**
   * 解析请求 ID：优先采用上游 `X-Request-Id`，缺失或格式非法时生成 UUID
   * @param req Express 请求对象
   * @returns 可安全用于日志的请求 ID
   */
  private resolveRequestId(req: AppRequest): string {
    const upstreamId = req.headers[TRACE_ID_HEADER];
    const candidate = Array.isArray(upstreamId) ? upstreamId[0] : upstreamId;

    if (candidate && TRACE_ID_PATTERN.test(candidate)) {
      return candidate;
    }

    return randomUUID();
  }
}
