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
 * 令牌类型声明（JWT 载荷 `typ` 字段）
 *
 * 访问令牌与刷新令牌使用同一 JWT 库与相近的载荷结构，必须靠 `typ` 区分，
 * 否则刷新令牌可被当作访问令牌使用（反之亦然），导致会话无法按预期失效。
 */
export const TOKEN_TYPES = {
  /** 访问令牌：仅用于接口鉴权 */
  ACCESS: 'access',
  /** 刷新令牌：仅用于 /auth/refresh 换取新令牌 */
  REFRESH: 'refresh',
} as const;

/** 令牌类型联合 */
export type TokenType = (typeof TOKEN_TYPES)[keyof typeof TOKEN_TYPES];

/**
 * 认证相关的元数据键
 */
export const AUTH_METADATA_KEYS = {
  /** 公共路由标识键 */
  IS_PUBLIC: 'isPublic',
} as const;

/**
 * 验证码相关常量
 */
export const CAPTCHA_CONSTANTS = {
  /** 验证码令牌有效期（秒） */
  TTL_SECONDS: 5 * 60,
} as const;
