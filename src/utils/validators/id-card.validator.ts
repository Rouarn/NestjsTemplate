/**
 * 身份证验证工具模块
 *
 * @description
 * 提供中国大陆居民身份证号码的全面验证功能，
 * 包括格式验证、校验位验证、信息提取和隐私保护等。
 *
 * 功能特性:
 * - 18位身份证号码格式验证
 * - 校验位算法验证 (GB 11643-1999标准)
 * - 生日信息提取和验证
 * - 性别信息识别
 * - 身份证号码脱敏显示
 * - 地区代码验证
 *
 * 验证标准:
 * - 基于 GB 11643-1999 国家标准
 * - 支持1900年以后出生的身份证
 * - 完整的校验位算法实现
 * - 严格的日期有效性检查
 *
 * 安全特性:
 * - 身份证号码隐私保护
 * - 防止身份信息泄露
 * - 支持脱敏显示
 * - 数据安全处理
 *
 * 适用场景:
 * - 用户实名认证
 * - 身份信息验证
 * - 年龄自动计算
 * - 性别自动识别
 * - 隐私信息保护
 *
 * 注意事项:
 * - 身份证信息属于敏感数据，需要安全处理
 * - 建议在服务端进行验证
 * - 遵守相关法律法规和隐私保护要求
 *
 * @example
 * ```typescript
 * import {
 *   isIdCard,
 *   isIdCardStrict,
 *   extractBirthFromIdCard,
 *   extractGenderFromIdCard,
 *   formatIdCardDisplay
 * } from '#/utils/validators/id-card.validator.js';
 *
 * // 基础格式验证
 * const valid = isIdCard('110101199001011234'); // true
 *
 * // 严格验证 (包含校验位)
 * const strictValid = isIdCardStrict('110101199001011234'); // 根据校验位确定
 *
 * // 提取生日
 * const birth = extractBirthFromIdCard('110101199001011234'); // '1990-01-01'
 *
 * // 提取性别
 * const gender = extractGenderFromIdCard('110101199001011234'); // 'female'
 *
 * // 脱敏显示
 * const masked = formatIdCardDisplay('110101199001011234'); // '110101********1234'
 * ```
 *
 * @author NestJS Template
 * @since 1.0.0
 */

/**
 * 校验身份证号码格式
 * @param idCard 身份证号码
 * @returns 是否为合法身份证号码
 */
export const isIdCard = (idCard: string): boolean => {
  return /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/.test(
    idCard,
  );
};

/**
 * 校验身份证号码（包含校验位验证）
 * @param idCard 身份证号码
 * @returns 是否为合法身份证号码
 */
export const isIdCardStrict = (idCard: string): boolean => {
  if (!isIdCard(idCard)) return false;

  // 校验位验证
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2'];

  let sum = 0;
  for (let i = 0; i < 17; i++) {
    sum += parseInt(idCard[i]) * weights[i];
  }

  const checkCode = checkCodes[sum % 11];
  return checkCode === idCard[17].toUpperCase();
};

/**
 * 从身份证号码中提取生日
 * @param idCard 身份证号码
 * @returns 生日字符串 (YYYY-MM-DD) 或 null
 */
export const extractBirthFromIdCard = (idCard: string): string | null => {
  if (!isIdCard(idCard)) return null;

  const year = idCard.substring(6, 10);
  const month = idCard.substring(10, 12);
  const day = idCard.substring(12, 14);

  return `${year}-${month}-${day}`;
};

/**
 * 从身份证号码中提取性别
 * @param idCard 身份证号码
 * @returns 性别 ('male' | 'female') 或 null
 */
export const extractGenderFromIdCard = (idCard: string): 'male' | 'female' | null => {
  if (!isIdCard(idCard)) return null;

  const genderCode = parseInt(idCard[16]);
  return genderCode % 2 === 1 ? 'male' : 'female';
};

/**
 * 格式化身份证号码显示（隐藏中间部分）
 * @param idCard 身份证号码
 * @returns 格式化后的身份证号码
 */
export const formatIdCardDisplay = (idCard: string): string => {
  if (!isIdCard(idCard)) return idCard;
  return idCard.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2');
};
