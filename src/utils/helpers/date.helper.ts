/**
 * 日期时间辅助工具模块
 *
 * 功能说明:
 * - 提供常用的日期时间格式化功能
 * - 支持时间戳处理和验证
 * - 提供文件路径时间格式化
 * - 处理时间过期检查
 *
 * 使用场景:
 * - 日志文件命名
 * - API 响应时间格式化
 * - 文件上传路径生成
 * - 缓存过期检查
 * - 数据库时间字段处理
 *
 * @author NestJS Template
 * @version 1.0.0
 */
import { formatDate } from './format-date.helper';

/**
 * 格式化当前时间戳为标准格式
 *
 * 获取当前时间并格式化为标准的日期时间字符串，
 * 常用于日志记录、数据库存储等场景。
 *
 * @returns 格式化后的时间字符串 (YYYY-MM-DD HH:mm:ss)
 *
 * @example
 * ```typescript
 * const timestamp = formatTimestamp();
 * console.log(timestamp); // '2024-01-15 14:30:25'
 *
 * // 用于日志记录
 * logger.info(`[${formatTimestamp()}] 用户登录成功`);
 * ```
 */
export const formatTimestamp = (): string => {
  return formatDate(new Date(), 'YYYY-MM-DD HH:mm:ss');
};

/**
 * 格式化当前时间为 ISO 8601 标准字符串
 *
 * 返回符合 ISO 8601 标准的时间字符串，
 * 包含时区信息，适用于国际化应用和 API 接口。
 *
 * @returns ISO 格式的时间字符串 (YYYY-MM-DDTHH:mm:ss.sssZ)
 *
 * @example
 * ```typescript
 * const isoString = formatISOString();
 * console.log(isoString); // '2024-01-15T06:30:25.123Z'
 *
 * // 用于 API 响应
 * return {
 *   data: result,
 *   timestamp: formatISOString()
 * };
 * ```
 */
export const formatISOString = (): string => {
  return new Date().toISOString();
};

/**
 * 格式化当前日期为文件路径格式
 *
 * 生成 YYYY-MM 格式的日期字符串，
 * 常用于按月份组织文件目录结构。
 *
 * @returns 日期路径字符串 (YYYY-MM)
 *
 * @example
 * ```typescript
 * const datePath = formatDatePath();
 * console.log(datePath); // '2024-01'
 *
 * // 用于文件上传路径
 * const uploadPath = `uploads/${formatDatePath()}/avatar.jpg`;
 * // 结果: 'uploads/2024-01/avatar.jpg'
 *
 * // 用于日志文件组织
 * const logPath = `logs/${formatDatePath()}/app.log`;
 * ```
 */
export const formatDatePath = (): string => {
  return new Date().toISOString().slice(0, 7);
};

/**
 * 获取当前时间戳 (毫秒)
 *
 * 返回当前时间的毫秒级时间戳，
 * 适用于性能测量、唯一ID生成等场景。
 *
 * @returns 当前时间戳 (毫秒)
 *
 * @example
 * ```typescript
 * const now = getCurrentTimestamp();
 * console.log(now); // 1705312225123
 *
 * // 用于性能测量
 * const startTime = getCurrentTimestamp();
 * await someAsyncOperation();
 * const endTime = getCurrentTimestamp();
 * const duration = endTime - startTime;
 *
 * // 用于生成唯一文件名
 * const fileName = `file_${getCurrentTimestamp()}.txt`;
 * ```
 */
export const getCurrentTimestamp = (): number => {
  return Date.now();
};

/**
 * 检查时间戳是否已过期
 *
 * 比较给定时间戳与当前时间的差值，
 * 判断是否超过了指定的有效期。
 * 常用于缓存过期、会话超时等场景。
 *
 * @param timestamp 要检查的时间戳 (毫秒)
 * @param maxAge 最大有效期 (毫秒)
 * @returns 是否过期 - true表示已过期，false表示未过期
 *
 * @example
 * ```typescript
 * // 检查缓存是否过期 (5分钟有效期)
 * const cacheTimestamp = 1705312225123;
 * const fiveMinutes = 5 * 60 * 1000;
 * const expired = isExpired(cacheTimestamp, fiveMinutes);
 *
 * if (expired) {
 *   // 重新获取数据
 *   data = await fetchFreshData();
 * }
 *
 * // 检查JWT令牌是否过期
 * const tokenTimestamp = jwt.iat * 1000; // JWT时间戳转毫秒
 * const tokenExpired = isExpired(tokenTimestamp, 24 * 60 * 60 * 1000); // 24小时
 * ```
 */
export const isExpired = (timestamp: number, maxAge: number): boolean => {
  return Date.now() - timestamp > maxAge;
};
