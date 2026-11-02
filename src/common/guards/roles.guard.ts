import { Role } from '../enums/index.js';
import { BusinessException } from '../exceptions/index.js';
import type { AppRequest } from '../interfaces/index.js';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator.js';

/**
 * 角色守卫（RolesGuard）
 *
 * 与 `@Roles()` 装饰器配合完成接口级授权，注册为全局守卫并排在
 * `JwtAuthGuard` 之后：此时 `request.user` 已由认证守卫注入。
 *
 * 行为约定：
 * - 未标注 `@Roles()` 的路由直接放行（仅受认证保护，与改造前一致）；
 * - 令牌未携带 `role` 声明（如改造前签发的旧令牌）一律视为无权限，失败关闭；
 * - 角色不匹配统一抛 403，避免把「接口存在」的信息透给无权限用户。
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AppRequest>();
    const role = request.user?.role;

    if (!role) {
      // 理论上 JwtAuthGuard 已拦截；此处兜底，避免守卫顺序被调整后越权
      throw BusinessException.unauthorized('未提供认证令牌');
    }

    if (!requiredRoles.includes(role)) {
      throw BusinessException.forbidden('无权访问该资源');
    }

    return true;
  }
}

/**
 * 本人或管理员守卫（SelfOrAdminGuard）
 *
 * 用于 `/users/:id` 这类「管理员可操作任意用户、普通用户只能操作自己」的路由：
 * 从路由参数 `id` 取目标用户 ID，与令牌中的 `userId` 比对。
 *
 * 注意：目标 ID 必须来自路由参数；若路由未声明 `:id`，一律按无权限处理，
 * 避免「忘记加参数」时静默放行。
 */
@Injectable()
export class SelfOrAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AppRequest>();
    const user = request.user;

    if (!user) {
      throw BusinessException.unauthorized('未提供认证令牌');
    }

    if (user.role === Role.ADMIN) {
      return true;
    }

    const targetId = request.params?.id;
    if (!targetId) {
      throw BusinessException.forbidden('缺少目标用户标识');
    }

    if (targetId !== user.userId) {
      throw BusinessException.forbidden('只能操作自己的账户');
    }

    return true;
  }
}
