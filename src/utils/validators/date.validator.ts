/**
 * 日期验证工具模块
 *
 * @description
 * 提供全面的日期和时间验证功能，包括格式验证、
 * 有效性检查、时间范围判断和年龄计算等功能。
 *
 * 功能特性:
 * - 日期有效性验证
 * - 多种日期时间格式支持
 * - 相对时间判断 (过去/现在/未来)
 * - 年龄范围验证
 * - 高性能的日期处理
 *
 * 支持格式:
 * - 标准日期: YYYY-MM-DD
 * - 标准时间: HH:mm:ss
 * - 日期时间: YYYY-MM-DD HH:mm:ss
 * - JavaScript Date 对象
 * - ISO 8601 格式
 *
 * 验证类型:
 * 1. 格式验证: 检查字符串格式是否正确
 * 2. 有效性验证: 检查日期是否真实存在
 * 3. 范围验证: 检查日期是否在指定范围内
 * 4. 业务验证: 年龄、生日等业务逻辑验证
 *
 * 适用场景:
 * - 用户生日验证
 * - 预约时间检查
 * - 数据有效期验证
 * - 年龄限制控制
 * - 时间范围查询
 *
 * @example
 * ```typescript
 * import {
 *   isValidDate,
 *   isDateFormat,
 *   isPastDate,
 *   isAgeInRange
 * } from '#/utils/validators/date.validator.js';
 *
 * // 日期有效性验证
 * const valid = isValidDate('2023-12-25'); // true
 *
 * // 格式验证
 * const formatValid = isDateFormat('2023-12-25'); // true
 *
 * // 时间判断
 * const isPast = isPastDate('2020-01-01'); // true
 *
 * // 年龄验证
 * const ageValid = isAgeInRange('1990-01-01', 18, 65); // true
 * ```
 *
 * @author NestJS Template
 * @since 1.0.0
 */

/**
 * 校验是否为有效日期
 * @param date 日期字符串或Date对象
 * @returns 是否为有效日期
 */
export const isValidDate = (date: string | Date): boolean => {
  const d = new Date(date);
  return d instanceof Date && !isNaN(d.getTime());
};

/**
 * 校验日期格式 (YYYY-MM-DD)
 * @param dateStr 日期字符串
 * @returns 是否符合格式
 */
export const isDateFormat = (dateStr: string): boolean => {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && isValidDate(dateStr);
};

/**
 * 校验时间格式 (HH:mm:ss)
 * @param timeStr 时间字符串
 * @returns 是否符合格式
 */
export const isTimeFormat = (timeStr: string): boolean => {
  return /^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/.test(timeStr);
};

/**
 * 校验日期时间格式 (YYYY-MM-DD HH:mm:ss)
 * @param datetimeStr 日期时间字符串
 * @returns 是否符合格式
 */
export const isDateTimeFormat = (datetimeStr: string): boolean => {
  return (
    /^\d{4}-\d{2}-\d{2} ([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/.test(datetimeStr) &&
    isValidDate(datetimeStr)
  );
};

/**
 * 校验是否为今天
 * @param date 日期字符串或Date对象
 * @returns 是否为今天
 */
export const isToday = (date: string | Date): boolean => {
  if (!isValidDate(date)) return false;

  const inputDate = new Date(date);
  const today = new Date();

  return inputDate.toDateString() === today.toDateString();
};

/**
 * 校验是否为过去的日期
 * @param date 日期字符串或Date对象
 * @returns 是否为过去的日期
 */
export const isPastDate = (date: string | Date): boolean => {
  if (!isValidDate(date)) return false;

  const inputDate = new Date(date);
  const now = new Date();

  return inputDate < now;
};

/**
 * 校验是否为未来的日期
 * @param date 日期字符串或Date对象
 * @returns 是否为未来的日期
 */
export const isFutureDate = (date: string | Date): boolean => {
  if (!isValidDate(date)) return false;

  const inputDate = new Date(date);
  const now = new Date();

  return inputDate > now;
};

/**
 * 校验年龄是否在指定范围内
 * @param birthDate 出生日期
 * @param minAge 最小年龄
 * @param maxAge 最大年龄
 * @returns 是否在年龄范围内
 */
export const isAgeInRange = (birthDate: string | Date, minAge: number, maxAge: number): boolean => {
  if (!isValidDate(birthDate)) return false;

  const birth = new Date(birthDate);
  const today = new Date();
  const age = today.getFullYear() - birth.getFullYear();

  return age >= minAge && age <= maxAge;
};
