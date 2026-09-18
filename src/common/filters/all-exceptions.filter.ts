/**
 * 全局异常过滤器（兜底）
 *
 * 捕获所有未被处理的异常，统一转换为规范的错误响应体：
 * - `HttpException`（含 `BusinessException`）：按异常自带的状态码与信息格式化
 * - 其他未知异常：返回 500 与固定文案，完整错误与堆栈只记录到日志，不泄露给客户端
 *
 * 注意：本过滤器依赖 Winston Logger，必须以依赖注入方式注册
 * （`APP_FILTER` + `useClass`）。不要使用 `new AllExceptionsFilter()` 手动实例化，
 * 否则依赖注入失效，记录日志时会抛出运行时错误。
 */
import type { ErrorResponse } from '#/common/interfaces/index.js';
import { formatISOString } from '#/utils/index.js';
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
import type { Logger } from 'winston';

/** 附带 `LoggerMiddleware` 注入的请求追踪信息的请求类型 */
type RequestWithId = Request & { requestId?: string; startTime?: number };

@Injectable()
@Catch()
/**
 * 捕获并格式化所有异常：
 * - `HttpException` 兼容 `string` 或对象形式的异常响应
 * - 自动填充 `code/message/data/success/timestamp/url/path`
 * - 结构化日志带 `requestId`，未知异常额外记录名称、信息与堆栈
 */
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  /**
   * 处理异常并写入响应
   * @param exception 抛出的异常（任意类型）
   * @param host Nest 调用上下文
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | string[] = '服务器内部错误';
    let data: unknown = {};
    if (isHttpException) {
      ({ message, data } = extractErrorPayload(exception));

      // 路由未匹配时 Nest 默认抛英文 `Cannot ${method} ${url}`；异常到达过滤器时
      // request.url 可能已被剥除全局前缀，与 message 中的 URL 不一致，
      // 故仅按「Cannot + 方法」前缀宽松匹配（业务文案不会以此开头，无误伤）
      if (
        status === HttpStatus.NOT_FOUND &&
        typeof message === 'string' &&
        message.startsWith(`Cannot ${request.method} `)
      ) {
        message = '接口不存在';
      }

      // 请求体 JSON 解析失败时 body-parser 抛英文内部错误，统一为友好提示
      if (
        status === HttpStatus.BAD_REQUEST &&
        typeof message === 'string' &&
        (message.includes('in JSON at position') ||
          message.includes('Unexpected token') ||
          message.includes('Unexpected end of JSON'))
      ) {
        message = '请求体 JSON 格式错误';
      }
    }

    // 结构化错误日志；未知异常额外记录名称与堆栈，便于排查
    const logData: Record<string, unknown> = {
      requestId: request.requestId,
      statusCode: status,
      timestamp: formatISOString(),
      path: request.url,
      method: request.method,
      message,
      data,
    };
    // 异常出口同样记录耗时（Guard/Pipe 阶段抛出的异常不经过拦截器，只能在此统计）
    if (typeof request.startTime === 'number') {
      logData.responseTime = Date.now() - request.startTime;
    }
    if (!isHttpException) {
      const err = exception as Error;
      logData.errorName = err?.name;
      logData.errorMessage = err?.message;
      logData.stack = err?.stack;
    }
    // 响应已开始写出（如流式传输中途失败）时无法再改写响应头，跳过写入避免二次异常
    if (response.headersSent) {
      logData.responseIgnored = true;
    }

    const logLabel = isHttpException ? 'HttpException' : 'UncaughtException';
    if (status >= 500) {
      this.logger.error(logLabel, logData);
    } else {
      this.logger.warn(logLabel, logData);
    }

    if (response.headersSent) return;

    // 统一的错误响应体；不向客户端返回堆栈等内部信息
    const body: ErrorResponse = {
      code: status,
      message,
      data,
      success: false,
      timestamp: formatISOString(),
      url: getUrl(request),
      path: request.path,
    };

    response.status(status).json(body);
  }
}

/**
 * 从 `HttpException` 中提取 message 与 data
 * - `string` 形式：直接作为 message
 * - 对象形式：取 `message` 与 `data`；无 `data` 时回退为空对象，
 *   避免将 Nest 内置异常的 `statusCode/error` 等内部字段透传给前端
 * @param exception `HttpException` 实例
 * @returns 规范化后的 message 与 data
 */
function extractErrorPayload(exception: HttpException): {
  message: string | string[];
  data: unknown;
} {
  const raw = exception.getResponse() as unknown;

  if (typeof raw === 'string') {
    return { message: raw, data: {} };
  }
  if (typeof raw === 'object' && raw) {
    const resObj = raw as Record<string, unknown>;
    const maybeMsg = resObj['message'];
    const message =
      typeof maybeMsg === 'string' || Array.isArray(maybeMsg)
        ? (maybeMsg as string | string[])
        : '请求失败';
    return { message, data: resObj['data'] ?? {} };
  }
  return { message: '请求失败', data: {} };
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
