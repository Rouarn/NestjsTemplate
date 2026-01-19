import type { CustomDecorator } from '@nestjs/common';
import { SetMetadata } from '@nestjs/common';

/**
 * 反射元数据键：当前处理程序所需的权限列表
 */
export const PERMISSIONS_KEY = 'permissions';

/**
 * 权限装饰器
 *
 * 在控制器或处理函数上标记所需的权限标识，
 * 由 {@link PermissionsGuard} 在请求时进行校验。
 */
export const RequirePermissions = (...permissions: string[]): CustomDecorator<string> =>
  SetMetadata(PERMISSIONS_KEY, permissions);
