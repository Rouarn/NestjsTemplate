/**
 * 全局异常过滤器（兜底）
 *
 * 职责：
 * 1. 把任意异常收敛为统一错误信封（`success: false`），500 不泄露堆栈；
 * 2. 输出**一条**结构化错误日志（与成功请求的访问日志同构，按 requestId 串联）；
 * 3. 把常见基础设施异常翻译成可读文案：唯一键冲突 → 409、限流 → 429、路由不存在 → 404。
 *
 * 注意：本过滤器依赖 Winston Logger 与配置服务，必须以依赖注入方式注册
 * （`APP_FILTER` + `useClass`），不要手动 `new`。
 */
import { sanitizeForLog } from '../helpers/index.js';
import type { AppRequest, ErrorResponse } from '../interfaces/index.js';
import { AppConfigService } from '../../config/index.js';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { Response } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { QueryFailedError } from 'typeorm';
import type { Logger } from 'winston';

/** MySQL 唯一键冲突错误码 */
const ER_DUP_ENTRY = 'ER_DUP_ENTRY';

/** 统一后的错误响应 */
interface NormalizedError {
  status: number;
  message: string | string[];
  data: unknown;
  /** 供日志使用的原始错误（不返回给客户端） */
  cause?: unknown;
}

@Injectable()
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly appConfig: AppConfigService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<AppRequest>();

    const normalized = this.normalize(exception, request);
    this.writeLog(normalized, request, response);

    // 响应已开始写出（如流式传输中途失败）时无法再改写响应头，避免二次异常
    if (response.headersSent) return;

    const body: ErrorResponse = {
      code: normalized.status,
      message: normalized.message,
      success: false,
      timestamp: new Date().toISOString(),
      url: getRequestUrl(request),
      data: normalized.data,
    };

    response.status(normalized.status).json(body);
  }

  /** 把各类异常翻译为统一结构 */
  private normalize(exception: unknown, request: AppRequest): NormalizedError {
    // 1. TypeORM 唯一键冲突
    if (exception instanceof QueryFailedError) {
      const driverError = exception.driverError as { code?: string } | undefined;
      if (driverError?.code === ER_DUP_ENTRY) {
        return {
          status: HttpStatus.CONFLICT,
          message: '数据已存在，请检查唯一字段',
          data: {},
          cause: exception,
        };
      }
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: '服务器内部错误',
        data: {},
        cause: exception,
      };
    }

    // 2. Nest HttpException（含 BusinessException）
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const { message, data } = extractErrorPayload(exception);

      return {
        status,
        message: this.translateStatusMessage(status, message, request),
        data,
        cause: exception,
      };
    }

    // 3. 其他未知异常
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: '服务器内部错误',
      data: {},
      cause: exception,
    };
  }

  /** 常见状态的文案归一化（不覆盖业务自带文案） */
  private translateStatusMessage(
    status: number,
    message: string | string[],
    request: AppRequest,
  ): string | string[] {
    if (typeof message !== 'string') return message;

    // 路由未匹配：Nest 默认抛英文 `Cannot GET /x`
    if (status === HttpStatus.NOT_FOUND && message.startsWith(`Cannot ${request.method} `)) {
      return '接口不存在';
    }

    // body-parser 的 JSON 解析错误
    if (
      status === HttpStatus.BAD_REQUEST &&
      (message.includes('in JSON at position') ||
        message.includes('Unexpected token') ||
        message.includes('Unexpected end of JSON'))
    ) {
      return '请求体 JSON 格式错误';
    }

    // @nestjs/throttler 的默认英文文案
    if (status === HttpStatus.TOO_MANY_REQUESTS) {
      return '请求过于频繁，请稍后再试';
    }

    return message;
  }

  /** 输出一条结构化错误日志 */
  private writeLog(error: NormalizedError, request: AppRequest, response: Response): void {
    const durationMs = typeof request.startTime === 'number' ? Date.now() - request.startTime : 0;

    // 防御：data 可能被上层改成非对象，取长度前先判定
    const hasDetails =
      typeof error.data === 'object' && error.data !== null && Object.keys(error.data).length > 0;

    const payload: Record<string, unknown> = {
      requestId: request.requestId ?? '',
      method: request.method,
      path: request.originalUrl,
      status: error.status,
      durationMs,
      ip: request.ip ?? '',
      message: error.message,
      ...(request.user?.userId ? { userId: request.user.userId } : {}),
      ...(hasDetails ? { data: sanitizeForLog(error.data) } : {}),
    };

    if (this.appConfig.loggerOptions.logBody) {
      payload.requestBody = sanitizeForLog(request.body);
    }

    if (!(error.cause instanceof HttpException)) {
      const cause = error.cause as Error | undefined;
      payload.errorName = cause?.name;
      payload.errorMessage = cause?.message;
      payload.stack = cause?.stack;
    }

    if (response.headersSent) {
      payload.responseIgnored = true;
    }

    const label = error.status >= 500 ? 'http_error' : 'http_rejected';
    if (error.status >= 500) {
      this.logger.error(label, payload);
    } else {
      this.logger.warn(label, payload);
    }
  }
}

/**
 * 从 `HttpException` 中提取 message 与 data
 *
 * - `string`：直接作为 message
 * - 对象：取 `message` 与 `data`，忽略 Nest 内置的 `statusCode` / `error` 字段
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
    const maybeMessage = resObj['message'];
    const message =
      typeof maybeMessage === 'string' || Array.isArray(maybeMessage)
        ? (maybeMessage as string | string[])
        : '请求失败';

    return { message, data: resObj['data'] ?? {} };
  }

  return { message: '请求失败', data: {} };
}

/**
 * 生成完整访问 URL
 *
 * 依赖 Express 的 `trust proxy` 解析 `X-Forwarded-*`，
 * 不再手工拼请求头，避免伪造头影响日志与响应。
 */
function getRequestUrl(request: AppRequest): string {
  const host = request.get('host');
  return host ? `${request.protocol}://${host}${request.originalUrl}` : request.originalUrl;
}
