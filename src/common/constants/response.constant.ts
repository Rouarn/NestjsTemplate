import type { PaginationParams } from '../interfaces/index.js';

/**
 * 成功响应信封中的固定提示语
 *
 * 业务提示（如「注册成功」）应作为 data 返回，不要改写信封 message，
 * 否则前端无法稳定地按信封判断请求结果。
 */
export const SUCCESS_MESSAGE = '请求成功';

/**
 * 默认分页参数
 *
 * 同时作为 DTO 的默认值与边界值来源，避免魔法数字散落各处。
 */
export const DEFAULT_PAGINATION: PaginationParams & {
  MIN_PAGE: number;
  DEFAULT_PAGE_SIZE: number;
  MAX_PAGE_SIZE: number;
} = {
  current: 1,
  size: 10,
  MIN_PAGE: 1,
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
};
