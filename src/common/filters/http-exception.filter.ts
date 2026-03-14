/**
 * 全局 HTTP 异常过滤器
 * 统一将所有 `HttpException` 转换为规范的错误响应体。
 * 建议在 `main.ts` 中通过 `app.useGlobalFilters(new HttpExceptionFilter())` 注册。
 */
import type { ErrorResponse } from '@/common/interfaces';
import { formatTimestamp } from '@/utils';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
@Catch(HttpException)
/**
 * 捕获并格式化 `HttpException`：
 * - 兼容 `string` 或对象形式的异常响应
 * - 自动填充 `code/message/data/success/timestamp/url/path`
 */
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  /**
   * 处理异常并写入响应
   * @param exception 抛出的 `HttpException`
   * @param host Nest 调用上下文
   */
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const originalStatus = exception.getStatus?.() ?? HttpStatus.INTERNAL_SERVER_ERROR;
    const raw = exception.getResponse() as unknown;

    let message: string | string[] = '请求失败';
    let data: unknown = {};

    // 兼容不同类型的异常响应：`string` 或对象
    if (typeof raw === 'string') {
      message = raw;
    } else if (typeof raw === 'object' && raw) {
      const resObj = raw as Record<string, unknown>;
      const maybeMsg = resObj['message'];
      const maybeData = resObj['data'];
      if (typeof maybeMsg === 'string' || Array.isArray(maybeMsg)) {
        message = maybeMsg as string | string[];
      }
      // 优先使用自带的 `data` 字段，否则回退为原始对象（便于调试）
      data = maybeData ?? resObj;
    }

    // 记录错误日志
    const logData = {
      statusCode: originalStatus,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
    };

    if (originalStatus >= 500) {
      this.logger.error('HttpException', logData);
    } else {
      this.logger.warn('HttpException', logData);
    }

    // 统一的错误响应体；生产环境不返回堆栈信息
    const body: ErrorResponse = {
      code: originalStatus,
      message,
      data,
      success: false,
      timestamp: formatTimestamp(),
      url: getUrl(request),
      path: request.path,
    };

    response.status(originalStatus).json(body);
  }
}

/**
 * 根据请求头与协议生成完整访问 URL
 * 优先使用反向代理头（`x-forwarded-host`/`x-forwarded-proto`）
 * @param request Express 请求对象
 * @returns 完整 URL 或原始路径
 */
function getUrl(request: Request): string {
  const host =
    (request.headers['x-forwarded-host'] as string) ?? (request.headers['host'] as string) ?? '';
  const proto = (request.headers['x-forwarded-proto'] as string) ?? request.protocol ?? 'http';
  return host ? `${proto}://${host}${request.originalUrl}` : request.originalUrl;
}
