import type { AppRequest } from '#/common/interfaces/index.js';
import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Inject, Injectable } from '@nestjs/common';
import type { Response } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Logger } from 'winston';

/**
 * 响应日志拦截器（LoggingInterceptor）
 *
 * 独立于 ResponseInterceptor，仅负责记录「成功响应」的出口日志
 * （状态码、耗时、响应数据、用户信息）。
 * 异常响应（含 Guard/Pipe 阶段抛出、不经过拦截器的异常）由
 * AllExceptionsFilter 统一记录，避免重复或遗漏。
 *
 * 注册顺序说明：
 * - 需在 APP_INTERCEPTOR 中先于 ResponseInterceptor 注册，
 *   这样本拦截器包裹在外侧，可记录经过格式化后的最终响应数据。
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<AppRequest>();
    const response = http.getResponse<Response>();

    return next.handle().pipe(
      tap((data: unknown) => {
        this.logResponse(request, response, data);
      }),
    );
  }

  /**
   * 打印成功响应的出口日志
   * @param request 请求对象
   * @param response Express 响应对象（用于读取状态码）
   * @param body 经过格式化后的响应数据
   */
  private logResponse(request: AppRequest, response: Response, body: unknown): void {
    const startTime = request.startTime ?? Date.now();
    const responseTime = Date.now() - startTime;

    this.logger.info('');
    this.logger.info('┌─ 📤 响应出口 ───────────────────────────────────────────────────┐');
    this.logger.info(`│ 🆔 请求 ID: ${request.requestId ?? ''}`);
    this.logger.info(`│ 🔗 请求路由: ${request.url}`);
    this.logger.info(`│ 🚀 请求方法: ${request.method}`);
    this.logger.info(`│ ✅ 状态码: ${response.statusCode}`);
    this.logger.info(`│ ⏱️  响应耗时: ${responseTime}ms`);

    const data = this.extractData(body);
    const dataStr = JSON.stringify(data, null, 2);
    const hasData = dataStr && dataStr !== '{}' && dataStr !== 'null';
    this.logger.info(`│ 📦 响应数据: ${hasData ? '' : '无'}`);
    if (hasData) {
      dataStr.split('\n').forEach((line) => {
        this.logger.info(`│    ${line}`);
      });
    }

    if (request.user) {
      this.logger.info('├─ 👤 用户信息 ───────────────────────────────────────────────────┤');
      this.logger.info(`│ 🆔 用户 ID: ${request.user.userId}`);
      this.logger.info(`│ 👤 用户名: ${request.user.username}`);
    }

    this.logger.info('└─────────────────────────────────────────────────────────────────┘');
    this.logger.info('');
  }

  /**
   * 从响应对象中安全提取 data 字段
   * @param response 任意响应对象
   * @returns data 字段值或原始响应
   */
  private extractData(response: unknown): unknown {
    if (response && typeof response === 'object' && 'data' in response) {
      return (response as { data?: unknown }).data;
    }
    return response;
  }
}
