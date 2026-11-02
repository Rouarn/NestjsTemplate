import { EnumHelper } from '../../utils/index.js';

/**
 * 角色枚举
 *
 * 用于接口级授权（RBAC 的最小实现）。角色值随访问令牌的 `role` 声明下发，
 * 由全局 `RolesGuard` 与 `@Roles()` 装饰器共同校验。
 */
export enum Role {
  /** 管理员：可管理其他用户 */
  ADMIN = 'admin',
  /** 普通用户：仅可读写自己的资料 */
  USER = 'user',
}

/**
 * 角色枚举的所有可能值
 */
export const ROLE_VALUES = EnumHelper.getValues(Role);

/**
 * 角色枚举类型
 */
export type RoleType = Role;

/**
 * 角色显示名称映射
 */
export const ROLE_LABELS: Record<Role, string> = {
  [Role.ADMIN]: '管理员',
  [Role.USER]: '普通用户',
} as const;

/**
 * 检查给定值是否为有效的角色枚举值
 * @param value - 要检查的值
 * @returns 如果是有效的角色枚举值则返回 true
 */
export function isValidRole(value: unknown): value is Role {
  return EnumHelper.hasValue(Role, value);
}

/**
 * 是否管理员
 * @param role - 角色值（可能来自未携带该声明的旧令牌）
 * @returns 仅当明确为管理员时返回 true（缺失按非管理员处理，失败关闭）
 */
export function isAdmin(role: Role | string | undefined | null): boolean {
  return role === Role.ADMIN;
}
