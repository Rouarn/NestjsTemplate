/**
 * 统一响应契约
 *
 * 所有成功响应由全局 `ResponseInterceptor` 包装为同一信封：
 * ```json
 * { "code": 200, "message": "请求成功", "success": true, "timestamp": "...", "data": {} }
 * ```
 * - `code` 与真实 HTTP 状态码保持一致（POST 成功即 201，不再固定 200）；
 * - 业务提示语放在 `data` 内（例如 `{ message: '注册成功' }`），信封 `message` 保持稳定；
 * - 失败响应由 `AllExceptionsFilter` 输出同构结构（`success: false`）。
 */

/** 成功响应信封 */
export interface IResponse<T = unknown> {
  /** HTTP 状态码（与响应状态行一致） */
  code: number;
  /** 稳定的成功提示（业务文案请放在 data 中） */
  message: string;
  success: true;
  /** ISO 8601 时间戳 */
  timestamp: string;
  data: T;
}

/** 错误响应信封 */
export interface ErrorResponse {
  code: number;
  message: string | string[];
  success: false;
  timestamp: string;
  /** 完整请求 URL（便于排查） */
  url: string;
  /** 结构化错误上下文（校验明细等） */
  data: unknown;
}

/**
 * 分页数据（信封中的 `data` 结构）
 *
 * 分页由 Service 显式构造并返回，拦截器不再通过请求参数或字段名猜测分页意图。
 */
export interface PaginatedData<T = unknown> {
  records: T[];
  total: number;
  totalPages: number;
  current: number;
  size: number;
}

/** 分页入参 */
export interface PaginationParams {
  current: number;
  size: number;
}
