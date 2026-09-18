import type { PaginationParams, SuccessResponse } from '@/common/interfaces';
import { formatISOString } from '@/utils';

/**
 * 成功响应常量
 *
 * 说明：作为统一成功响应的默认模板使用；实际接口响应由 `ResponseInterceptor`
 * 在运行时动态生成并填充 `timestamp` 等字段。
 */
export const SUCCESS_RESPONSE: SuccessResponse = {
  code: 200,
  message: '请求成功',
  data: null,
  success: true,
  timestamp: formatISOString(),
};

/**
 * 默认分页参数
 *
 * 说明：用于缺省分页入参（如 `current/size`），并提供常量边界值。
 */
export const DEFAULT_PAGINATION: PaginationParams & {
  MIN_PAGE: number;
  DEFAULT_PAGE_SIZE: number;
} = {
  current: 1,
  size: 10,
  MIN_PAGE: 1,
  DEFAULT_PAGE_SIZE: 10,
};
