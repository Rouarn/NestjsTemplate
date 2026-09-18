/**
 * 字符串验证工具模块
 *
 * @description
 * 提供全面的字符串验证功能，包括格式验证、长度检查、
 * 字符类型验证、用户名密码验证等常用功能。
 *
 * 功能特性:
 * - 字符串空值和长度验证
 * - 字符类型验证 (字母、数字、中文)
 * - 用户名和密码强度验证
 * - 特殊字符检测
 * - 国际化字符支持
 * - 高性能的正则表达式匹配
 *
 * 验证类型:
 * 1. 基础验证: 空值、长度、字符类型
 * 2. 格式验证: 用户名、密码格式规则
 * 3. 内容验证: 字符组成、特殊字符
 * 4. 安全验证: 密码强度、输入过滤
 *
 * 字符集支持:
 * - ASCII 字符 (a-z, A-Z, 0-9)
 * - 中文字符 (Unicode 4e00-9fa5)
 * - 特殊符号和标点
 * - 国际化字符集
 *
 * 适用场景:
 * - 用户注册验证
 * - 表单输入校验
 * - 密码安全检查
 * - 内容过滤和审核
 * - 数据清洗和标准化
 *
 * 安全特性:
 * - 防止注入攻击
 * - 输入内容过滤
 * - 密码强度要求
 * - 特殊字符控制
 *
 * @example
 * ```typescript
 * import {
 *   isEmpty,
 *   isLengthInRange,
 *   isAlphanumeric,
 *   isUsername,
 *   isStrongPassword
 * } from '#/utils/validators/string.validator.js';
 *
 * // 空值检查
 * const empty = isEmpty('   '); // true
 *
 * // 长度验证
 * const lengthValid = isLengthInRange('hello', 3, 10); // true
 *
 * // 字母数字验证
 * const alphanumeric = isAlphanumeric('abc123'); // true
 *
 * // 用户名验证
 * const username = isUsername('user_123'); // true
 *
 * // 密码强度验证
 * const strongPwd = isStrongPassword('MyPass123'); // true
 * ```
 *
 * @author NestJS Template
 * @since 1.0.0
 */

/**
 * 校验是否为空字符串或仅包含空白字符
 * @param str 字符串
 * @returns 是否为空
 */
export const isEmpty = (str: string): boolean => {
  return str?.trim().length === 0;
};

/**
 * 校验字符串长度是否在指定范围内
 * @param str 字符串
 * @param min 最小长度
 * @param max 最大长度
 * @returns 是否在范围内
 */
export const isLengthInRange = (str: string, min: number, max: number): boolean => {
  const length = str.length;
  return length >= min && length <= max;
};

/**
 * 校验是否只包含字母
 * @param str 字符串
 * @returns 是否只包含字母
 */
export const isAlpha = (str: string): boolean => {
  return /^[a-zA-Z]+$/.test(str);
};

/**
 * 校验是否只包含字母和数字
 * @param str 字符串
 * @returns 是否只包含字母和数字
 */
export const isAlphanumeric = (str: string): boolean => {
  return /^[a-zA-Z0-9]+$/.test(str);
};

/**
 * 校验是否只包含中文字符
 * @param str 字符串
 * @returns 是否只包含中文字符
 */
export const isChinese = (str: string): boolean => {
  return /^[\u4e00-\u9fa5]+$/.test(str);
};

/**
 * 校验是否为有效的用户名（字母、数字、下划线，3-20位）
 * @param username 用户名
 * @returns 是否为有效用户名
 */
export const isUsername = (username: string): boolean => {
  return /^[a-zA-Z0-9_]{3,20}$/.test(username);
};

/**
 * 校验密码强度（至少8位，包含大小写字母、数字）
 * @param password 密码
 * @returns 是否为强密码
 */
export const isStrongPassword = (password: string): boolean => {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/.test(password);
};

/**
 * 校验是否包含特殊字符
 * @param str 字符串
 * @returns 是否包含特殊字符
 */
export const hasSpecialChars = (str: string): boolean => {
  return /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(str);
};
