import { BusinessExceptionFactory } from '@/common/exceptions';
import { CurrentUser } from '@/common/interfaces';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { RbacService } from '../services/rbac.service';

/**
 * 权限守卫
 *
 * 根据 {@link RequirePermissions} 标记的权限标识，
 * 检查当前用户是否拥有访问当前处理程序所需的权限。
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rbacService: RbacService,
  ) {}

  /**
   * 决定当前请求是否被允许继续执行
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as CurrentUser;

    if (!user?.userId) {
      throw BusinessExceptionFactory.unauthorized('用户未登录');
    }

    const userPermissions = await this.rbacService.getUserPermissions(user.userId);

    // ANY strategy: 只要拥有其中一个权限即可
    const hasPermission = requiredPermissions.some((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasPermission) {
      throw BusinessExceptionFactory.forbidden('操作权限不足', {
        required: requiredPermissions,
      });
    }

    return true;
  }
}
