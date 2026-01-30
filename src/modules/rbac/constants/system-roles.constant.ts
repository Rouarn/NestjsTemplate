import type { RegisterDto } from '@/modules/auth/dto/register.dto';
import type { Role } from '../entities/role.entity';
import { Status } from '@/common/enums';

/**
 * 系统默认角色
 */
export enum SystemRoles {
  /** 超级管理员 (站长) - 拥有所有权限 */
  ADMIN = 'R_SUPER_ADMIN',
  /** 内容编辑/协管员 - 负责内容管理 */
  EDITOR = 'R_EDITOR',
  /** 普通用户 - 注册会员 */
  USER = 'R_USER',
}

/**
 * 系统默认角色列表
 */
export const SYSTEM_ROLES_LIST = Object.values(SystemRoles);

/**
 * 系统默认角色描述
 */
export const DEFAULT_SYSTEM_ROLES_DESCRIPTION = {
  [SystemRoles.ADMIN]: '系统最高权限角色，拥有所有功能',
  [SystemRoles.EDITOR]: '负责内容管理与发布',
  [SystemRoles.USER]: '系统默认的标准用户角色',
};

/**
 * 系统默认角色
 */
export const DEFAULT_SYSTEM_ROLES: Partial<Role>[] = [
  {
    name: SystemRoles.ADMIN,
    alias: '超级管理员',
    description: DEFAULT_SYSTEM_ROLES_DESCRIPTION[SystemRoles.ADMIN],
    isSystem: Status.ENABLED,
  },
  {
    name: SystemRoles.EDITOR,
    alias: '内容管理员',
    description: DEFAULT_SYSTEM_ROLES_DESCRIPTION[SystemRoles.EDITOR],
    isSystem: Status.ENABLED,
  },
  {
    name: SystemRoles.USER,
    alias: '普通用户',
    description: DEFAULT_SYSTEM_ROLES_DESCRIPTION[SystemRoles.USER],
    isSystem: Status.ENABLED,
  },
];

/**
 * 系统默认用户
 */
export interface DefaultSystemUser extends Partial<RegisterDto> {
  roles: SystemRoles[];
}

/**
 * 系统默认用户列表
 */
export const DEFAULT_SYSTEM_USERS: DefaultSystemUser[] = [
  {
    username: 'superadmin',
    password: '123456',
    email: 'admin@example.com',
    nickname: '超级管理员',
    roles: [SystemRoles.ADMIN],
  },
  {
    username: 'editor',
    password: '123456',
    email: 'editor@example.com',
    nickname: '内容管理员',
    roles: [SystemRoles.EDITOR],
  },
  {
    username: 'user',
    password: '123456',
    email: 'user@example.com',
    nickname: '普通用户',
    roles: [SystemRoles.USER],
  },
];
