import { SUCCESS_MESSAGE } from '../constants/index.js';
import type { IResponse } from '../interfaces/index.js';
import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { HttpStatus, Injectable } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * 响应信封拦截器
 *
 * 只做一件事：把 Controller 返回的裸数据包装成统一信封。
 * - 不猜测分页（分页结构由 Service 显式返回 `PaginatedData`）；
 * - 不嗅探 `{ data, message }` 之类的包装对象（避免与业务字段撞名）；
 * - `code` 固定为业务成功码 200，与 HTTP 状态行解耦：POST 创建仍返回 201，
 *   但信封里的 `code` 始终是 200 —— 前端 HTTP 客户端以 `code === 200` 判定成功。
 */
@Injectable()
export class ResponseInterceptor<T = unknown> implements NestInterceptor<T, IResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<IResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        code: HttpStatus.OK,
        message: SUCCESS_MESSAGE,
        success: true as const,
        timestamp: new Date().toISOString(),
        data: (data ?? null) as T,
      })),
    );
  }
}
