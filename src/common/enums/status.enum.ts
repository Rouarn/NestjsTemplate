import { EnumHelper } from '../../utils/index.js';

/**
 * 状态枚举
 * 定义系统中通用的状态类型
 */
export enum Status {
  /** 禁用/停用/否 */
  DISABLED = 0,
  /** 启用/激活/是 */
  ENABLED = 1,
}

/**
 * 状态枚举的所有可能值
 */
export const STATUS_VALUES = EnumHelper.getValues(Status) as number[];

/**
 * 状态枚举类型
 */
export type StatusType = Status;

/**
 * 状态显示名称映射
 */
export const STATUS_LABELS: Record<Status, string> = {
  [Status.DISABLED]: '禁用',
  [Status.ENABLED]: '启用',
} as const;

/**
 * 状态枚举键名映射
 */
export const STATUS_KEYS: Record<Status, keyof typeof Status> = {
  [Status.DISABLED]: 'DISABLED',
  [Status.ENABLED]: 'ENABLED',
} as const;

/**
 * 状态描述映射
 */
export const STATUS_DESCRIPTIONS: Record<Status, string> = {
  [Status.DISABLED]: '该项目已被禁用，不可使用',
  [Status.ENABLED]: '该项目已启用，可正常使用',
} as const;

/**
 * 检查给定值是否为有效的状态枚举值
 * @param value - 要检查的值
 * @returns 如果是有效的状态枚举值则返回 true
 */
export function isValidStatus(value: unknown): value is Status {
  return EnumHelper.hasValue(Status, value);
}

/**
 * 获取状态的显示名称
 * @param status - 状态枚举值
 * @returns 状态的显示名称
 */
export function getStatusLabel(status: Status): string {
  return STATUS_LABELS[status];
}

/**
 * 获取状态的键名
 * @param status - 状态枚举值
 * @returns 状态的键名
 */
export function getStatusKey(status: Status): keyof typeof Status {
  return EnumHelper.getKeyByValue(Status, status)!;
}

/**
 * 获取状态的描述
 * @param status - 状态枚举值
 * @returns 状态的描述
 */
export function getStatusDescription(status: Status): string {
  return STATUS_DESCRIPTIONS[status];
}

/**
 * 解析字符串为状态枚举
 * @param statusStr - 状态字符串
 * @returns 对应的状态枚举值
 * @throws 如果字符串无法解析为有效状态则抛出错误
 */
export function parseStatus(statusStr: string): Status {
  const upperStr = statusStr.toUpperCase();

  // 尝试按键名解析
  if (upperStr in Status) {
    return Status[upperStr as keyof typeof Status];
  }

  // 尝试按数字解析
  const numValue = parseInt(statusStr, 10);
  if (!isNaN(numValue) && isValidStatus(numValue)) {
    return numValue;
  }

  // 尝试按显示名称解析
  const statusEntry = Object.entries(STATUS_LABELS).find(([, label]) => label === statusStr);
  if (statusEntry) {
    return parseInt(statusEntry[0], 10);
  }

  throw new Error(`无法解析状态值: ${statusStr}`);
}

/**
 * 获取状态选项列表（用于下拉框等组件）
 * @returns 状态选项数组
 */
export function getStatusOptions(): {
  value: Status;
  label: string;
  key: string;
  description: string;
}[] {
  return EnumHelper.toOptions(Status, STATUS_LABELS).map((option) => ({
    ...option,
    description: getStatusDescription(option.value),
  }));
}

/**
 * 切换状态（启用变禁用，禁用变启用）
 * @param status - 当前状态
 * @returns 切换后的状态
 */
export function toggleStatus(status: Status): Status {
  return status === Status.ENABLED ? Status.DISABLED : Status.ENABLED;
}

/**
 * 检查状态是否为启用状态
 * @param status - 要检查的状态
 * @returns 如果是启用状态则返回 true
 */
export function isEnabled(status: Status): boolean {
  return status === Status.ENABLED;
}

/**
 * 检查状态是否为禁用状态
 * @param status - 要检查的状态
 * @returns 如果是禁用状态则返回 true
 */
export function isDisabled(status: Status): boolean {
  return status === Status.DISABLED;
}
