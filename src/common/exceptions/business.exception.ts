/**
 * 业务异常封装
 *
 * 统一将 NestJS 的 `HttpException` 转为规范化的业务错误响应体，
 * 便于前后端约定与日志采集。
 *
 * 使用场景：服务端主动抛出可预期的错误（校验失败、权限不足、资源不存在、冲突等）。
 *
 * 推荐用法（message-first 静态工厂，第一参数即最终响应文案）：
 * ```ts
 * throw BusinessException.notFound('用户不存在', { id });
 * throw BusinessException.badRequest('旧密码错误');
 * ```
 * 未覆盖的状态码可直接 `new BusinessException(message, HttpStatus.XXX)` 兜底。
 */
import { formatISOString } from '../../utils/index.js';
import { HttpException, HttpStatus } from '@nestjs/common';

/** 错误上下文类型：随响应体 `data` 字段返回，用于调试信息或补充提示 */
export type BusinessExceptionDetails = Record<string, unknown>;

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
  readonly details?: BusinessExceptionDetails;

  /**
   * 构造一个业务异常（任意状态码的兜底入口）
   * @param message 错误信息，支持字符串或字符串数组
   * @param status HTTP 状态码，默认 400
   * @param details 额外的错误上下文（可选）
   */
  constructor(
    message: string | string[],
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    details?: BusinessExceptionDetails,
  ) {
    // 只构造异常载荷；响应信封（含 url）由 AllExceptionsFilter 统一生成
    const body = {
      code: status,
      message,
      data: details ?? {},
      success: false as const,
      timestamp: formatISOString(),
    };
    super(body, status);
    this.details = details;
  }

  /**
   * 参数错误 / 校验失败
   * @param message 完整错误文案，默认「请求参数不合法」
   * @param details 额外上下文（可选）
   */
  static badRequest(
    message: string | string[] = '请求参数不合法',
    details?: BusinessExceptionDetails,
  ): BusinessException {
    return new BusinessException(message, HttpStatus.BAD_REQUEST, details);
  }

  /**
   * 未授权（需要登录或凭证无效）
   * @param message 完整错误文案，默认「未授权」
   * @param details 额外上下文（可选）
   */
  static unauthorized(
    message: string | string[] = '未授权',
    details?: BusinessExceptionDetails,
  ): BusinessException {
    return new BusinessException(message, HttpStatus.UNAUTHORIZED, details);
  }

  /**
   * 无权限（登录态有效但权限不足）
   * @param message 完整错误文案，默认「无权限」
   * @param details 额外上下文（可选）
   */
  static forbidden(
    message: string | string[] = '无权限',
    details?: BusinessExceptionDetails,
  ): BusinessException {
    return new BusinessException(message, HttpStatus.FORBIDDEN, details);
  }

  /**
   * 资源不存在
   * @param message 完整错误文案，默认「资源不存在」
   * @param details 额外上下文（可选）
   */
  static notFound(
    message: string | string[] = '资源不存在',
    details?: BusinessExceptionDetails,
  ): BusinessException {
    return new BusinessException(message, HttpStatus.NOT_FOUND, details);
  }

  /**
   * 资源冲突（如唯一键冲突）
   * @param message 完整错误文案，默认「资源冲突」
   * @param details 额外上下文（可选）
   */
  static conflict(
    message: string | string[] = '资源冲突',
    details?: BusinessExceptionDetails,
  ): BusinessException {
    return new BusinessException(message, HttpStatus.CONFLICT, details);
  }

  /**
   * 服务不可用（依赖组件故障、维护中）
   * @param message 完整错误文案，默认「服务暂不可用」
   * @param details 额外上下文（可选）
   */
  static unavailable(
    message: string | string[] = '服务暂不可用',
    details?: BusinessExceptionDetails,
  ): BusinessException {
    return new BusinessException(message, HttpStatus.SERVICE_UNAVAILABLE, details);
  }

  /**
   * 系统繁忙 / 流量控制
   * @param message 完整错误文案，默认「请求过于频繁」
   * @param details 额外上下文（可选）
   */
  static tooManyRequests(
    message: string | string[] = '请求过于频繁',
    details?: BusinessExceptionDetails,
  ): BusinessException {
    return new BusinessException(message, HttpStatus.TOO_MANY_REQUESTS, details);
  }
}
