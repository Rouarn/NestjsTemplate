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
}
