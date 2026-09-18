import { EnumHelper } from '#/utils/index.js';

/**
 * 用户性别枚举
 * 定义系统中支持的性别类型
 */
export enum Gender {
  /** 男性 */
  MALE = 0,
  /** 女性 */
  FEMALE = 1,
  /** 未知/不愿透露 */
  UNKNOWN = 2,
}

/**
 * 性别枚举的所有可能值
 */
export const GENDER_VALUES = EnumHelper.getValues(Gender) as number[];

/**
 * 性别枚举类型
 */
export type GenderType = Gender;

/**
 * 性别显示名称映射
 */
export const GENDER_LABELS: Record<Gender, string> = {
  [Gender.MALE]: '男',
  [Gender.FEMALE]: '女',
  [Gender.UNKNOWN]: '未知',
} as const;

/**
 * 性别枚举键名映射
 */
export const GENDER_KEYS: Record<Gender, keyof typeof Gender> = {
  [Gender.MALE]: 'MALE',
  [Gender.FEMALE]: 'FEMALE',
  [Gender.UNKNOWN]: 'UNKNOWN',
} as const;

/**
 * 检查给定值是否为有效的性别枚举值
 * @param value - 要检查的值
 * @returns 如果是有效的性别枚举值则返回 true
 */
export function isValidGender(value: unknown): value is Gender {
  return EnumHelper.hasValue(Gender, value);
}

/**
 * 获取性别的显示标签
 * @param gender - 性别枚举值
 * @returns 对应的中文显示标签
 */
export function getGenderLabel(gender: Gender): string {
  return GENDER_LABELS[gender] ?? '未知';
}

/**
 * 获取性别的键名
 * @param gender - 性别枚举值
 * @returns 对应的枚举键名
 */
export function getGenderKey(gender: Gender): keyof typeof Gender {
  return EnumHelper.getKeyByValue(Gender, gender)!;
}

/**
 * 从字符串解析性别枚举
 * @param genderStr - 性别字符串 ('male', 'female', 'unknown' 或 '男', '女', '未知')
 * @returns 对应的性别枚举值，无法解析时返回 UNKNOWN
 */
export function parseGender(genderStr: string): Gender {
  const lowerStr = genderStr.toLowerCase().trim();

  switch (lowerStr) {
    case 'male':
    case '男':
    case 'm':
      return Gender.MALE;
    case 'female':
    case '女':
    case 'f':
      return Gender.FEMALE;
    case 'unknown':
    case '未知':
    case 'other':
    case '其他':
    default:
      return Gender.UNKNOWN;
  }
}

/**
 * 获取所有性别选项（用于表单选择）
 * @returns 包含值和标签的选项数组
 */
export function getGenderOptions(): {
  value: Gender;
  label: string;
  key: string;
}[] {
  return EnumHelper.toOptions(Gender, GENDER_LABELS);
}
