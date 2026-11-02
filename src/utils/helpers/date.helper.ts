/**
 * 时间工具
 *
 * 模板内统一使用 ISO 8601（UTC）表示时间点，避免本地化格式在不同时区下产生歧义；
 * 展示层的本地化由前端负责。
 */

/**
 * 格式化为 ISO 8601 字符串
 * @param date 目标时间，默认当前时间
 * @returns 例如 `2026-01-01T00:00:00.000Z`
 */
export const formatISOString = (date: Date = new Date()): string => date.toISOString();
