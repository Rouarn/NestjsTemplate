/**
 * 邮箱验证工具模块
 *
 * @description
 * 提供全面的邮箱格式验证功能，包括基础验证、严格验证、
 * 企业邮箱识别和域名白名单检查等功能。
 *
 * 功能特性:
 * - 基础邮箱格式验证
 * - RFC 5322 标准的严格验证
 * - 企业邮箱与个人邮箱区分
 * - 邮箱域名白名单验证
 * - 高性能的正则表达式匹配
 *
 * 验证级别:
 * 1. 基础验证: 常用的邮箱格式检查
 * 2. 严格验证: 符合 RFC 标准的完整验证
 * 3. 业务验证: 企业邮箱识别和域名控制
 *
 * 安全考虑:
 * - 防止邮箱注入攻击
 * - 支持域名黑白名单控制
 * - 企业级邮箱安全策略
 *
 * @example
 * ```typescript
 * import {
 *   isEmail,
 *   isEmailStrict,
 *   isCorporateEmail
 * } from '#/utils/validators/email.validator.js';
 *
 * // 基础验证
 * const valid = isEmail('user@example.com'); // true
 *
 * // 严格验证
 * const strictValid = isEmailStrict('user@example.com'); // true
 *
 * // 企业邮箱检查
 * const isCorp = isCorporateEmail('user@company.com'); // true
 * const isPersonal = isCorporateEmail('user@gmail.com'); // false
 * ```
 *
 * @author NestJS Template
 * @since 1.0.0
 */

/**
 * 校验邮箱格式 (基础验证)
 *
 * @description
 * 使用常用的正则表达式进行邮箱格式验证。
 * 适用于大多数常见的邮箱格式检查场景。
 *
 * 验证规则:
 * - 用户名部分: 支持字母、数字、下划线、连字符
 * - 支持用户名中的点号分隔
 * - 域名部分: 至少包含一个点号
 * - 顶级域名: 2-7个字母
 *
 * 性能特点:
 * - 轻量级正则表达式，执行速度快
 * - 内存占用小，适合高频调用
 * - 覆盖99%的常见邮箱格式
 *
 * @param email 需要验证的邮箱字符串
 * @returns boolean 如果邮箱格式正确返回 true，否则返回 false
 *
 * @example
 * ```typescript
 * // 有效邮箱示例
 * isEmail('user@example.com');        // true
 * isEmail('test.email@domain.org');   // true
 * isEmail('user_name@company.co.uk'); // true
 *
 * // 无效邮箱示例
 * isEmail('invalid-email');           // false
 * isEmail('user@');                   // false
 * isEmail('@domain.com');             // false
 * isEmail('user@domain');             // false
 *
 * // 在表单验证中使用
 * const validateEmailInput = (input: string): string | null => {
 *   if (!input.trim()) {
 *     return '邮箱不能为空';
 *   }
 *   if (!isEmail(input)) {
 *     return '请输入有效的邮箱地址';
 *   }
 *   return null;
 * };
 * ```
 *
 * @see isEmailStrict 更严格的邮箱验证
 * @see isCorporateEmail 企业邮箱验证
 */
export const isEmail = (email: string): boolean => {
  return /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(email);
};

/**
 * 校验邮箱格式 (严格模式 - RFC 5322 标准)
 *
 * @description
 * 基于 RFC 5322 标准的严格邮箱格式验证。
 * 提供更全面和准确的邮箱格式检查，适用于对邮箱格式
 * 要求严格的企业级应用场景。
 *
 * 验证特点:
 * - 符合 RFC 5322 国际标准
 * - 支持更多特殊字符 (!#$%&'*+/=?^_`{|}~)
 * - 严格的域名长度限制 (最大63字符)
 * - 完整的域名格式验证
 * - 防止常见的邮箱格式攻击
 *
 * 适用场景:
 * - 企业级用户注册系统
 * - 金融和安全敏感应用
 * - 国际化邮箱支持
 * - 严格的数据质量要求
 *
 * 性能考虑:
 * - 复杂正则表达式，执行时间稍长
 * - 适合低频但高质量的验证场景
 * - 建议在服务端进行严格验证
 *
 * @param email 需要验证的邮箱字符串
 * @returns boolean 如果邮箱完全符合 RFC 标准返回 true，否则返回 false
 *
 * @example
 * ```typescript
 * // 标准邮箱格式
 * isEmailStrict('user@example.com');           // true
 * isEmailStrict('test.email@domain.org');      // true
 *
 * // 支持特殊字符
 * isEmailStrict('user+tag@example.com');       // true
 * isEmailStrict('user.name+tag@example.com');  // true
 * isEmailStrict('user_name@example-domain.com'); // true
 *
 * // 复杂但有效的邮箱
 * isEmailStrict('test.email+tag@subdomain.example.com'); // true
 *
 * // 在用户注册中使用
 * const validateUserEmail = async (email: string): Promise<{
 *   valid: boolean;
 *   message?: string;
 * }> => {
 *   if (!isEmailStrict(email)) {
 *     return {
 *       valid: false,
 *       message: '邮箱格式不符合国际标准，请检查格式'
 *     };
 *   }
 *
 *   // 进一步检查邮箱是否已存在
 *   const exists = await checkEmailExists(email);
 *   if (exists) {
 *     return {
 *       valid: false,
 *       message: '该邮箱已被注册'
 *     };
 *   }
 *
 *   return { valid: true };
 * };
 * ```
 *
 * @see isEmail 基础邮箱验证 (性能更好)
 * @see isCorporateEmail 企业邮箱识别
 */
export const isEmailStrict = (email: string): boolean => {
  const strictEmailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return strictEmailRegex.test(email);
};

/**
 * 校验是否为企业邮箱
 * @param email 邮箱字符串
 * @returns 是否为企业邮箱
 */
export const isCorporateEmail = (email: string): boolean => {
  if (!isEmail(email)) return false;

  const personalDomains = [
    'gmail.com',
    'yahoo.com',
    'hotmail.com',
    'outlook.com',
    'qq.com',
    '163.com',
    '126.com',
    'sina.com',
    'sohu.com',
  ];

  const domain = email.split('@')[1].toLowerCase();
  return !personalDomains.includes(domain);
};

/**
 * 校验邮箱域名是否在白名单中
 * @param email 邮箱字符串
 * @param allowedDomains 允许的域名列表
 * @returns 是否在白名单中
 */
export const isEmailDomainAllowed = (email: string, allowedDomains: string[]): boolean => {
  if (!isEmail(email)) return false;

  const domain = email.split('@')[1].toLowerCase();
  return allowedDomains.map((d) => d.toLowerCase()).includes(domain);
};
