import { CurrentUser } from '@/common/interfaces/current-user.interface';
import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Inject, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Logger } from 'winston';

// 扩展 Express 的 Request 接口，以包含自定义属性
interface AppRequest extends Request {
  user?: CurrentUser;
  requestId?: string;
}

/**
 * 响应日志拦截器（LoggingInterceptor）
 *
 * 独立于 ResponseInterceptor，仅负责记录响应出口日志。
 * 如需调整日志格式或关闭日志，只需修改本拦截器，不影响响应数据格式化逻辑。
 *
 * 注册顺序说明：
 * - 需在 APP_INTERCEPTOR 中先于 ResponseInterceptor 注册，
 *   这样本拦截器包裹在外侧，可记录经过格式化后的最终响应数据。
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AppRequest>();

    return next.handle().pipe(
      tap((response: unknown) => {
        this.logResponse(request, response);
      }),
    );
  }

  /**
   * 打印响应出口日志
   * @param request 请求对象
   * @param response 经过格式化后的响应数据
   */
  private logResponse(request: AppRequest, response: unknown): void {
    this.logger.info('');
    this.logger.info('┌─ 📤 响应出口 ───────────────────────────────────────────────────┐');
    this.logger.info(`│ 🆔 请求 ID: ${request.requestId ?? ''}`);
    this.logger.info(`│ 🔗 请求路由: ${request.url}`);
    this.logger.info(`│ 🚀 请求方法: ${request.method}`);

    const data = this.extractData(response);
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
