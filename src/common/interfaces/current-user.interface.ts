import type { Role } from '../enums/index.js';

/**
 * 当前用户信息接口
 *
 * 定义在请求处理过程中可用的当前经过身份验证的用户信息结构。
 * 这些信息通常由 Guards（如 JwtAuthGuard）注入到 request 对象中。
 */
export interface CurrentUser {
  /** 认证ID */
  authId: string;

  /** 用户ID */
  userId: string;

  /** 用户名 */
  username: string;

  /**
   * 角色
   *
   * 由访问令牌的 `role` 声明带入；改造前签发的旧令牌没有该声明，
   * 此时守卫按「非管理员」处理（失败关闭），重新登录即可获得新声明。
   */
  role: Role;
}
