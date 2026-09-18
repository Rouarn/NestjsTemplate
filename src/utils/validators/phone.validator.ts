/**
 * 手机号验证工具模块
 *
 * @description
 * 提供全面的手机号码验证功能，支持中国大陆手机号、
 * 国际手机号格式验证，以及手机号格式化显示功能。
 *
 * 功能特性:
 * - 中国大陆手机号验证 (基础和严格模式)
 * - 国际手机号格式验证
 * - 手机号隐私保护格式化
 * - 高性能的正则表达式匹配
 * - 支持最新的手机号段
 *
 * 验证级别:
 * 1. 基础验证: 11位数字，1开头的常用格式
 * 2. 严格验证: 包含具体号段的精确验证
 * 3. 国际验证: 支持国际电话号码格式
 *
 * 安全特性:
 * - 手机号脱敏显示功能
 * - 防止手机号格式攻击
 * - 支持隐私保护展示
 *
 * 适用场景:
 * - 用户注册和登录验证
 * - 短信验证码发送
 * - 联系方式管理
 * - 国际化应用支持
 *
 * @example
 * ```typescript
 * import {
 *   isPhone,
 *   isPhoneStrict,
 *   formatPhoneDisplay
 * } from '#/utils/validators/phone.validator.js';
 *
 * // 基础验证
 * const valid = isPhone('13800138000'); // true
 *
 * // 严格验证
 * const strictValid = isPhoneStrict('13800138000'); // true
 *
 * // 格式化显示
 * const masked = formatPhoneDisplay('13800138000'); // '138****8000'
 * ```
 *
 * @author NestJS Template
 * @since 1.0.0
 */

/**
 * 校验中国大陆手机号 (基础验证)
 *
 * @description
 * 验证中国大陆地区的手机号码格式。
 * 使用简化的正则表达式进行快速验证，
 * 适用于大多数常见的手机号验证场景。
 *
 * 验证规则:
 * - 总长度: 11位数字
 * - 首位: 必须是数字1
 * - 第二位: 3-9之间的数字
 * - 后9位: 任意数字
 *
 * 支持的号段:
 * - 13x: 中国移动、中国联通、中国电信
 * - 14x: 中国移动、中国联通、中国电信
 * - 15x: 中国移动、中国联通、中国电信
 * - 16x: 中国联通
 * - 17x: 中国移动、中国联通、中国电信
 * - 18x: 中国移动、中国联通、中国电信
 * - 19x: 中国移动、中国联通、中国电信
 *
 * 性能特点:
 * - 轻量级正则表达式，执行速度快
 * - 适合高频验证场景
 * - 内存占用小
 *
 * @param phone 需要验证的手机号字符串 (11位数字)
 * @returns boolean 如果是有效的中国大陆手机号返回 true，否则返回 false
 *
 * @example
 * ```typescript
 * // 有效手机号示例
 * isPhone('13800138000');  // true - 中国移动
 * isPhone('15912345678');  // true - 中国移动
 * isPhone('18612345678');  // true - 中国联通
 * isPhone('17712345678');  // true - 中国电信
 *
 * // 无效手机号示例
 * isPhone('12345678901');  // false - 第二位不在范围内
 * isPhone('1380013800');   // false - 长度不足
 * isPhone('138001380000'); // false - 长度超出
 * isPhone('23800138000');  // false - 不以1开头
 *
 * // 在用户注册中使用
 * const validatePhoneInput = (input: string): string | null => {
 *   if (!input.trim()) {
 *     return '手机号不能为空';
 *   }
 *   if (!isPhone(input)) {
 *     return '请输入有效的手机号码';
 *   }
 *   return null;
 * };
 *
 * // 在短信发送前验证
 * const sendSMS = async (phone: string, message: string) => {
 *   if (!isPhone(phone)) {
 *     throw new Error('无效的手机号码格式');
 *   }
 *   // 发送短信逻辑...
 * };
 * ```
 *
 * @see isPhoneStrict 更严格的手机号验证 (包含具体号段)
 * @see isInternationalPhone 国际手机号验证
 * @see formatPhoneDisplay 手机号脱敏显示
 */
export const isPhone = (phone: string): boolean => {
  return /^1[3-9]\d{9}$/.test(phone);
};

/**
 * 校验中国大陆手机号（严格模式）
 * @param phone 手机号字符串
 * @returns 是否为合法手机号
 */
export const isPhoneStrict = (phone: string): boolean => {
  // 更严格的手机号验证，包含具体的号段
  const strictPhoneRegex = /^1(3[0-9]|4[01456879]|5[0-35-9]|6[2567]|7[0-8]|8[0-9]|9[0-35-9])\d{8}$/;
  return strictPhoneRegex.test(phone);
};

/**
 * 校验国际手机号格式
 * @param phone 手机号字符串（包含国家代码）
 * @returns 是否为合法国际手机号
 */
export const isInternationalPhone = (phone: string): boolean => {
  return /^\+[1-9]\d{1,14}$/.test(phone);
};

/**
 * 格式化手机号显示（隐藏中间4位）
 * @param phone 手机号字符串
 * @returns 格式化后的手机号
 */
export const formatPhoneDisplay = (phone: string): string => {
  if (!isPhone(phone)) return phone;
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
};
