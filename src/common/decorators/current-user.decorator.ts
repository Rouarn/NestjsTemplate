import type { ExecutionContext } from '@nestjs/common';
import { createParamDecorator } from '@nestjs/common';
import type { Request } from 'express';
import type { CurrentUser } from '../interfaces/index.js';

/**
 * 获取当前用户装饰器（GetCurrentUser）
 *
 * 用于在控制器方法参数中直接获取当前登录用户的认证信息。
 * 与新的认证架构集成，返回标准化的用户认证信息。
 */
export const GetCurrentUser = createParamDecorator(
  (
    field: keyof CurrentUser | undefined,
    ctx: ExecutionContext,
  ): CurrentUser | string | string[] | Date | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user: CurrentUser | undefined = request.user;

    return field ? user?.[field] : user;
  },
);
