import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { CurrentUser } from '@/common/interfaces';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { RbacService } from '../services/rbac.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rbacService: RbacService,
  ) {}

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
      return false;
    }

    const userPermissions = await this.rbacService.getUserPermissions(user.userId);

    // ANY strategy: 只要拥有其中一个权限即可
    return requiredPermissions.some((permission) => userPermissions.includes(permission));
  }
}
