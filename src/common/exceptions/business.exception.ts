/**
 * 业务异常封装
 *
 * 统一将 NestJS 的 `HttpException` 转为规范化的业务错误响应体，
 * 便于前后端约定与日志采集。
 *
 * 使用场景：服务端主动抛出可预期的错误（校验失败、权限不足、资源不存在、冲突等）。
 */
import type { ErrorResponse } from '@/common/interfaces';
import { formatTimestamp } from '@/utils';
import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * 业务异常类
 *
 * 继承自 `HttpException`，封装标准的错误响应结构。
 *
 * 字段说明：
 * - `code`: HTTP 状态码
 * - `message`: 错误信息（可为字符串或字符串数组，支持多条提示）
 * - `data`: 额外错误上下文（对象），默认空对象
 * - `success`: 固定为 `false`
 * - `timestamp`: 服务端时间戳
 */
export class BusinessException extends HttpException {
  /** 额外的错误上下文，用于传递调试信息或提示文案 */
  readonly details?: unknown;

  /**
   * 构造一个业务异常
   * @param message 错误信息，支持字符串或字符串数组
   * @param status HTTP 状态码
   * @param details 额外的错误上下文（可选）
   */
  constructor(message: string | string[], status: HttpStatus, details?: unknown) {
    const body: ErrorResponse = {
      code: status,
      message,
      data: details ?? {},
      success: false,
      timestamp: formatTimestamp(),
    };
    super(body, status);
    this.details = details;
  }
}

/**
 * 常用业务异常的工厂方法，避免各处重复书写状态码与文案。
 * 所有方法均返回 `BusinessException`，可直接在服务/控制器中抛出。
 */
export class BusinessExceptionFactory {
  /**
   * 参数校验失败
   * @param target 具体校验目标，如“用户名”
   * @param details 额外上下文（可选）
   */
  static validation(target: string, details?: unknown): BusinessException {
    return new BusinessException(
      `${target} ${target ? '- ' : ''}验证失败`,
      HttpStatus.BAD_REQUEST,
      details,
    );
  }

  /**
   * 参数不合法
   * @param target 具体参数名
   * @param details 额外上下文（可选）
   */
  static invalidParameter(target: string, details?: unknown): BusinessException {
    return new BusinessException(
      `${target} ${target ? '- ' : ''}参数不合法`,
      HttpStatus.BAD_REQUEST,
      details,
    );
  }

  /**
   * 未授权（需要登录或凭证无效）
   * @param target 资源或操作名称
   * @param details 额外上下文（可选）
   */
  static unauthorized(target: string, details?: unknown): BusinessException {
    return new BusinessException(
      `${target} ${target ? '- ' : ''}未授权`,
      HttpStatus.UNAUTHORIZED,
      details,
    );
  }

  /**
   * 无权限（登录态有效但权限不足）
   * @param target 资源或操作名称
   * @param details 额外上下文（可选）
   */
  static forbidden(target: string, details?: unknown): BusinessException {
    return new BusinessException(
      `${target} ${target ? '- ' : ''}无权限`,
      HttpStatus.FORBIDDEN,
      details,
    );
  }

  /**
   * 资源不存在
   * @param target 资源名称或标识
   * @param details 额外上下文（可选）
   */
  static notFound(target: string, details?: unknown): BusinessException {
    return new BusinessException(
      `${target} ${target ? '- ' : ''}不存在`,
      HttpStatus.NOT_FOUND,
      details,
    );
  }

  /**
   * 资源冲突（如唯一键冲突）
   * @param target 资源名称或标识
   * @param details 额外上下文（可选）
   */
  static conflict(target: string, details?: unknown): BusinessException {
    return new BusinessException(
      `${target} ${target ? '- ' : ''}冲突`,
      HttpStatus.CONFLICT,
      details,
    );
  }

  /**
   * 系统繁忙/流量控制
   * 可通过 `details.message` 自定义提示文案
   * @param details 可选的上下文；可包含 `message` 字段
   */
  static systemBusy(details?: {
    message?: string | string[];
    [key: string]: unknown;
  }): BusinessException {
    const { message = '系统繁忙', ...rest } = details ?? {};
    return new BusinessException(message, HttpStatus.TOO_MANY_REQUESTS, rest);
  }
}
