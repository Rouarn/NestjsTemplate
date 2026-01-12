import { CurrentUser } from '@/common/interfaces';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RbacService } from '../services/rbac.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as CurrentUser;

    if (!user?.userId) {
      return false;
    }

    // 优先使用请求中的用户信息（已由JwtAuthGuard填充），减少数据库查询
    let userRoles = user.roles;

    if (!userRoles || userRoles.length === 0) {
      userRoles = await this.rbacService.getUserRoles(user.userId);
    }

    return requiredRoles.some((role) => userRoles.includes(role));
  }
}
