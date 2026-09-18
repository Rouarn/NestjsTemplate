import type { HttpStatus } from '@nestjs/common';

/**
 * 通用响应接口 - 返回给前端的格式
 *
 * 标准响应结构：
 * - data: 业务数据
 * - message: 提示信息（成功路径为 string）
 * - code: HTTP 状态码
 * - timestamp: 响应时间戳（ISO 8601 字符串，含时区）
 *
 * 泛型说明：
 * - T: 业务数据类型
 * - M: message 类型，默认为 string；错误响应可指定为 string | string[]
 */
export interface IResponse<T = unknown, M = string> {
  data: T;
  message: M;
  code: HttpStatus;
  timestamp: string;
}

/**
 * 成功响应接口
 */
export interface SuccessResponse<T = unknown> extends IResponse<T> {
  success: true;
}

/**
 * 错误响应接口
 *
 * 说明：错误场景下 message 支持 string（单条）或 string[]（多条校验提示）。
 */
export interface ErrorResponse extends IResponse<unknown, string | string[]> {
  success: false;
  url?: string;
  path?: string;
}

/**
 * 开发者接口返回数据类型（普通接口）
 * Controller 中可以返回的格式:
 * 1. 直接返回数据: T (如 {token: 'xxx'} 或 string 等)
 * 2. 包装格式: {data: T, message?: string}
 *
 * 说明：
 * - 普通接口无需分页字段，拦截器会自动包装为统一响应结构。
 * - message 可选；未提供时会使用默认成功消息。
 */
export type DeveloperResponse<T = unknown> =
  | T
  | {
      data: T;
      message?: string;
    };

/**
 * 开发者接口返回数据类型（分页接口）
 * Controller 中可以返回的格式:
 * 1. 直接返回分页数据: {list: T[], total: number}
 * 2. 直接返回分页数据: {records: T[], total: number}
 * 3. 直接返回分页数据: {data: T[], total: number}
 * 4. 包装格式: {data: {list: T[], total: number}, message?: string}
 * 5. 包装格式: {data: {data: T[], total: number}, message?: string}
 * 6. 包装格式: {data: {records: T[], total: number}, message?: string}
 *
 * 说明：
 * - 数组字段名支持 list/records/data 三选一，total 为总记录数。
 * - 如外层包含 message，则会被拦截器透传为响应消息。
 */
export type DeveloperPaginatedResponse<T = unknown> =
  | PaginatedArrayPayload<T>
  | {
      data: PaginatedArrayPayload<T>;
      message?: string;
    };

/**
 * 分页数组载荷（开发者返回的数据本体）
 *
 * 支持以下三种数组字段名中的任意一种：
 * - { list: T[], total: number }
 * - { records: T[], total: number }
 * - { data: T[], total: number }
 *
 * 拦截器会自动识别并归一化为标准分页响应。
 */
export type PaginatedArrayPayload<T = unknown> =
  { list: T[]; total: number } | { records: T[]; total: number } | { data: T[]; total: number };

/**
 * 分页数据类型 - 返回给前端的格式
 * @param records 分页数据列表
 * @param total 总记录数
 * @param totalPages 总页数
 * @param current 当前页码
 * @param size 每页数量
 *
 * 说明：这是拦截器统一返回的标准分页结构。
 */
export interface PaginatedData<T = unknown> {
  records: T[];
  total: number;
  totalPages: number;
  current: number;
  size: number;
}

/**
 * 分页响应类型 - 返回给前端的格式
 */
export type PaginatedResponse<T = unknown> = IResponse<PaginatedData<T>>;

/**
 * 分页参数
 * @param current 当前页码
 * @param size 每页数量
 */
export interface PaginationParams {
  current: number;
  size: number;
}
