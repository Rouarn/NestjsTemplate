import type { RegisterDto } from '@/modules/auth/dto/register.dto';
import type { Role } from '../entities/role.entity';

export enum SystemRoles {
  /** 超级管理员 (站长) - 拥有所有权限 */
  ADMIN = 'R_SUPER_ADMIN',
  /** 内容编辑/协管员 - 负责内容管理 */
  EDITOR = 'R_EDITOR',
  /** 普通用户 - 注册会员 */
  USER = 'R_USER',
}

export const SYSTEM_ROLES_LIST = Object.values(SystemRoles);

export const DEFAULT_SYSTEM_ROLES: Partial<Role>[] = [
  {
    name: SystemRoles.ADMIN,
    alias: '超级管理员',
    description: '拥有系统所有权限的超级管理员',
    isSystem: true,
  },
  {
    name: SystemRoles.EDITOR,
    alias: '内容管理员',
    description: '负责内容管理与发布',
    isSystem: true,
  },
  {
    name: SystemRoles.USER,
    alias: '普通用户',
    description: '系统默认的标准用户角色',
    isSystem: true,
  },
];

export interface DefaultSystemUser extends Partial<RegisterDto> {
  roles: SystemRoles[];
}

export const DEFAULT_SYSTEM_USERS: DefaultSystemUser[] = [
  {
    username: SystemRoles.ADMIN,
    password: '123456',
    email: 'admin@example.com',
    nickname: '超级管理员',
    roles: [SystemRoles.ADMIN],
  },
  {
    username: SystemRoles.EDITOR,
    password: '123456',
    email: 'editor@example.com',
    nickname: '内容管理员',
    roles: [SystemRoles.EDITOR],
  },
  {
    username: SystemRoles.USER,
    password: '123456',
    email: 'user@example.com',
    nickname: '普通用户',
    roles: [SystemRoles.USER],
  },
];
