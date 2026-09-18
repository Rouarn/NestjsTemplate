import { WHITE_LIST_ROUTES } from '@/common/constants/auth.constant';

/**
 * 白名单认证工具类
 * 用于判断请求路径是否需要进行身份认证
 */
export class WhitelistAuth {
  /**
   * 检查请求路径是否在认证白名单中
   * 支持精确匹配和通配符前缀匹配（如 /public/*）
   *
   * @param path 需要检查的请求路径
   * @returns 如果路径在白名单中返回 true，否则返回 false
   */
  static isWhitelistedPath(path: string): boolean {
    return WHITE_LIST_ROUTES.some((route) => {
      // 通配符前缀匹配 (路由以 /* 结尾)
      if (route.endsWith('/*')) {
        const basePath = route.slice(0, -2);
        return path.startsWith(basePath);
      }
      // 精确路径匹配
      return path === route;
    });
  }
}
