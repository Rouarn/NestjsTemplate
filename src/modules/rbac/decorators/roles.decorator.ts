import type { CustomDecorator } from '@nestjs/common';
import { SetMetadata } from '@nestjs/common';

/**
 * 反射元数据键：当前处理程序所需的角色列表
 */
export const ROLES_KEY = 'roles';

/**
 * 角色装饰器
 *
 * 在控制器或处理函数上标记所需的角色标识，
 * 由 {@link RolesGuard} 在请求时进行校验。
 */
export const RequireRoles = (...roles: string[]): CustomDecorator<string> =>
  SetMetadata(ROLES_KEY, roles);
