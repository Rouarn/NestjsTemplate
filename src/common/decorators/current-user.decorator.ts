import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import type { AuthenticatedRequest, CurrentUser } from '../interfaces/index.js';

/** CurrentUser 单个字段的取值类型（随接口定义自动更新） */
type CurrentUserField = CurrentUser[keyof CurrentUser];

/**
 * 获取当前用户装饰器（GetCurrentUser）
 *
 * 用于在控制器方法参数中直接获取当前登录用户的认证信息。
 * 装饰器在 Guard 之后解析，仅适用于受 JwtAuthGuard 保护的路由：
 * - 不传字段：返回整个 CurrentUser
 * - 传入字段名：返回对应字段值
 *
 * 注意：@Public() 公开路由上 user 可能不存在，不应使用本装饰器，
 * 此类场景请直接通过 getRequest<AppRequest>() 自行判空。
 */
export const GetCurrentUser = createParamDecorator(
  (field: keyof CurrentUser | undefined, ctx: ExecutionContext): CurrentUser | CurrentUserField => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    return field ? user?.[field] : user;
  },
);
