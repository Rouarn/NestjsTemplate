import { SUCCESS_MESSAGE } from '../constants/index.js';
import type { IResponse } from '../interfaces/index.js';
import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { Response } from 'express';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * 响应信封拦截器
 *
 * 只做一件事：把 Controller 返回的裸数据包装成统一信封。
 * - 不猜测分页（分页结构由 Service 显式返回 `PaginatedData`）；
 * - 不嗅探 `{ data, message }` 之类的包装对象（避免与业务字段撞名）；
 * - `code` 取真实 `response.statusCode`，与状态行保持一致。
 */
@Injectable()
export class ResponseInterceptor<T = unknown> implements NestInterceptor<T, IResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<IResponse<T>> {
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((data) => ({
        code: response.statusCode,
        message: SUCCESS_MESSAGE,
        success: true as const,
        timestamp: new Date().toISOString(),
        data: (data ?? null) as T,
      })),
    );
  }
}
