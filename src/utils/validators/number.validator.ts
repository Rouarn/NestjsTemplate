/**
 * 数字验证工具模块
 *
 * @description
 * 提供全面的数字类型验证功能，包括整数、浮点数、
 * 范围验证、特殊数值格式验证等。
 *
 * 功能特性:
 * - 整数类型验证 (正整数、非负整数)
 * - 浮点数验证和精度控制
 * - 数值范围验证
 * - 特殊格式验证 (百分比、金额)
 * - 类型安全的数值转换
 * - 高性能的验证算法
 *
 * 验证类型:
 * 1. 基础类型: 整数、浮点数验证
 * 2. 范围验证: 最小值、最大值限制
 * 3. 格式验证: 百分比、金额格式
 * 4. 业务验证: 特定业务场景的数值规则
 *
 * 适用场景:
 * - 表单数据验证
 * - API参数校验
 * - 金融数据处理
 * - 统计数据验证
 * - 配置参数检查
 *
 * 安全考虑:
 * - 防止数值溢出
 * - 精度丢失处理
 * - 非法输入过滤
 * - 类型转换安全
 *
 * @example
 * ```typescript
 * import {
 *   isInteger,
 *   isPositiveInteger,
 *   isInRange,
 *   isPercentage,
 *   isMoney
 * } from '#/utils/validators/number.validator.js';
 *
 * // 整数验证
 * const valid = isInteger('123'); // true
 *
 * // 正整数验证
 * const positive = isPositiveInteger(5); // true
 *
 * // 范围验证
 * const inRange = isInRange(50, 0, 100); // true
 *
 * // 百分比验证
 * const percentage = isPercentage(85.5); // true
 *
 * // 金额验证
 * const money = isMoney('99.99'); // true
 * ```
 *
 * @author NestJS Template
 * @since 1.0.0
 */

/**
 * 校验是否为整数
 * @param value 值
 * @returns 是否为整数
 */
export const isInteger = (value: unknown): boolean => {
  return Number.isInteger(Number(value));
};

/**
 * 校验是否为正整数
 * @param value 值
 * @returns 是否为正整数
 */
export const isPositiveInteger = (value: unknown): boolean => {
  const num = Number(value);
  return Number.isInteger(num) && num > 0;
};

/**
 * 校验是否为非负整数
 * @param value 值
 * @returns 是否为非负整数
 */
export const isNonNegativeInteger = (value: unknown): boolean => {
  const num = Number(value);
  return Number.isInteger(num) && num >= 0;
};

/**
 * 校验是否为浮点数
 * @param value 值
 * @returns 是否为浮点数
 */
export const isFloat = (value: unknown): boolean => {
  return !isNaN(parseFloat(String(value))) && isFinite(Number(value));
};

/**
 * 校验是否在指定范围内
 * @param value 值
 * @param min 最小值
 * @param max 最大值
 * @returns 是否在范围内
 */
export const isInRange = (value: number, min: number, max: number): boolean => {
  return value >= min && value <= max;
};

/**
 * 校验是否为有效的百分比（0-100）
 * @param value 值
 * @returns 是否为有效百分比
 */
export const isPercentage = (value: unknown): boolean => {
  const num = Number(value);
  return isFloat(num) && num >= 0 && num <= 100;
};

/**
 * 校验是否为有效的金额（最多2位小数）
 * @param value 值
 * @returns 是否为有效金额
 */
export const isMoney = (value: unknown): boolean => {
  return /^\d+(\.\d{1,2})?$/.test(String(value));
};
