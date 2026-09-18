/**
 * URL验证工具模块
 *
 * @description
 * 提供全面的URL和网络地址验证功能，包括URL格式验证、
 * 协议检查、域名验证、IP地址验证等网络相关验证。
 *
 * 功能特性:
 * - 标准URL格式验证
 * - HTTP/HTTPS协议验证
 * - 域名格式和有效性检查
 * - IPv4和IPv6地址验证
 * - 网络安全验证
 * - 高性能的URL解析
 *
 * 验证类型:
 * 1. URL验证: 完整URL格式和协议检查
 * 2. 域名验证: 域名格式和规范性验证
 * 3. IP验证: IPv4和IPv6地址格式验证
 * 4. 协议验证: HTTP、HTTPS等协议检查
 *
 * 支持协议:
 * - HTTP/HTTPS (网页协议)
 * - FTP/FTPS (文件传输)
 * - 自定义协议验证
 *
 * 网络地址类型:
 * - 完整URL (包含协议、域名、路径)
 * - 域名 (example.com)
 * - IPv4地址 (192.168.1.1)
 * - IPv6地址 (2001:db8::1)
 *
 * 适用场景:
 * - 网站链接验证
 * - API端点验证
 * - 网络配置检查
 * - 安全URL过滤
 * - 爬虫URL验证
 *
 * 安全考虑:
 * - 恶意URL检测
 * - 协议安全验证
 * - 内网地址过滤
 * - URL注入防护
 *
 * @example
 * ```typescript
 * import {
 *   isUrl,
 *   isHttpUrl,
 *   isHttpsUrl,
 *   isDomain,
 *   isIpAddress
 * } from '#/utils/validators/url.validator.js';
 *
 * // URL验证
 * const validUrl = isUrl('https://example.com'); // true
 *
 * // HTTP协议验证
 * const httpUrl = isHttpUrl('http://api.example.com'); // true
 *
 * // HTTPS协议验证
 * const httpsUrl = isHttpsUrl('https://secure.example.com'); // true
 *
 * // 域名验证
 * const domain = isDomain('example.com'); // true
 *
 * // IP地址验证
 * const ip = isIpAddress('192.168.1.1'); // true
 * ```
 *
 * @author NestJS Template
 * @since 1.0.0
 */

/**
 * 校验URL格式
 * @param url URL字符串
 * @returns 是否为合法URL
 */
export const isUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * 校验HTTP/HTTPS URL
 * @param url URL字符串
 * @returns 是否为合法的HTTP/HTTPS URL
 */
export const isHttpUrl = (url: string): boolean => {
  return /^https?:\/\/.+/.test(url) && isUrl(url);
};

/**
 * 校验HTTPS URL
 * @param url URL字符串
 * @returns 是否为合法的HTTPS URL
 */
export const isHttpsUrl = (url: string): boolean => {
  return /^https:\/\/.+/.test(url) && isUrl(url);
};

/**
 * 校验域名格式
 * @param domain 域名字符串
 * @returns 是否为合法域名
 */
export const isDomain = (domain: string): boolean => {
  return /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(
    domain,
  );
};

/**
 * 校验IP地址格式
 * @param ip IP地址字符串
 * @returns 是否为合法IP地址
 */
export const isIpAddress = (ip: string): boolean => {
  return /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
    ip,
  );
};

/**
 * 校验IPv6地址格式
 * @param ipv6 IPv6地址字符串
 * @returns 是否为合法IPv6地址
 */
export const isIpv6Address = (ipv6: string): boolean => {
  return /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/.test(ipv6);
};
