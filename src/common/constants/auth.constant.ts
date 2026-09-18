/**
 * 认证相关常量
 *
 * 定义身份认证和授权相关的常量配置。
 */

/**
 * JWT 相关常量
 */
export const JWT_CONSTANTS = {
  /** JWT Token 在请求头中的字段名 */
  HEADER_KEY: 'Authorization',
  /** JWT Token 的前缀 */
  TOKEN_PREFIX: 'Bearer',
} as const;

/**
 * 认证相关的元数据键
 */
export const AUTH_METADATA_KEYS = {
  /** 公共路由标识键 */
  IS_PUBLIC: 'isPublic',
} as const;
