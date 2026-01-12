/**
 * 缓存相关常量定义
 *
 * 定义缓存模块中使用的注入令牌和其他常量
 * 避免在代码中使用硬编码字符串，提高代码的可维护性
 *
 * @author NestJS Template
 * @version 1.0.0
 */

/**
 * 缓存服务注入令牌
 */
export const CACHE_TOKENS = {
  /** ICacheService 接口令牌 */
  I_CACHE_SERVICE: Symbol('I_CACHE_SERVICE'),
} as const;

/**
 * 缓存键前缀常量
 */
export const CACHE_PREFIXES = {
  /** 黑名单令牌缓存键前缀 */
  BLACKLIST: 'auth:blacklist:',
  /** 用户令牌缓存键前缀 */
  USER_TOKENS: 'auth:user_tokens:',
  /** 刷新令牌缓存键前缀 */
  REFRESH_TOKENS: 'auth:refresh_tokens:',
  /** 用户资料缓存键前缀 */
  USER_PROFILE: 'users:profile:',
  /** RBAC用户权限缓存键前缀 */
  RBAC_USER_PERMISSIONS: 'rbac:user_permissions:',
} as const;

/**
 * 缓存 TTL 常量（秒）
 */
export const CACHE_TTL = {
  /** 用户资料缓存过期时间（1小时） */
  USER_PROFILE: 3600,
} as const;
