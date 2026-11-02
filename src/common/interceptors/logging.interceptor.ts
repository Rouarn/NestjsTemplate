import type { AppRequest } from '../interfaces/index.js';
import { sanitizeForLog } from '../helpers/index.js';
import { AppConfigService } from '../../config/index.js';
import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Inject, Injectable } from '@nestjs/common';
import type { Response } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Logger } from 'winston';

/**
 * 访问日志拦截器（成功出口）
 *
 * 每个成功请求输出**一条**结构化日志（JSON 单行）：
 * `requestId / method / path / status / durationMs / ip / userId`，
 * 仅在 `NEST_LOG_BODY=true` 时附加脱敏后的请求体与响应体。
 *
 * 失败请求由 `AllExceptionsFilter` 输出同构的一条日志，两者互补、不重复。
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly appConfig: AppConfigService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<AppRequest>();
    const response = http.getResponse<Response>();
    const startedAt = request.startTime ?? Date.now();

    return next.handle().pipe(
      tap((data: unknown) => {
        this.logger.info('http_request', {
          ...this.baseFields(request, response, startedAt),
          ...this.bodyFields(request, data),
        });
      }),
    );
  }

  /** 请求元信息（不含业务数据） */
  private baseFields(
    request: AppRequest,
    response: Response,
    startedAt: number,
  ): {
    requestId: string;
    method: string;
    path: string;
    status: number;
    durationMs: number;
    ip: string;
    userId?: string;
  } {
    return {
      requestId: request.requestId ?? '',
      method: request.method,
      path: request.originalUrl,
      status: response.statusCode,
      durationMs: Date.now() - startedAt,
      ip: request.ip ?? '',
      ...(request.user?.userId ? { userId: request.user.userId } : {}),
    };
  }

  /** 请求/响应体（默认关闭，开启后仍会脱敏） */
  private bodyFields(request: AppRequest, data: unknown): Record<string, unknown> {
    if (!this.appConfig.loggerOptions.logBody) return {};

    return {
      requestBody: sanitizeForLog(request.body),
      responseBody: sanitizeForLog(data),
    };
  }
}
