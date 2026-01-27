import { CACHE_PREFIXES, CACHE_TOKENS, JWT_CONSTANTS } from '@/common/constants';
import { Status } from '@/common/enums';
import { BusinessExceptionFactory } from '@/common/exceptions';
import { CurrentUser } from '@/common/interfaces';
import { AppConfigService } from '@/config';
import { AuthService } from '@/modules/auth/auth.service';
import { SystemRoles } from '@/modules/rbac/constants/system-roles.constant';
import { ICacheService } from '@/shared/cache';
import { WhitelistAuth } from '@/utils';
import { CanActivate, ExecutionContext, Inject, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators';

/**
 * JwtAuthGuard（JWT 认证守卫）
 *
 * 用于保护需要身份认证的路由，手动实现 JWT 校验逻辑。
 * 集成了原 JwtAuthStrategy 的业务逻辑，不再依赖 passport-jwt。
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
    private readonly appConfig: AppConfigService,
    @Inject(CACHE_TOKENS.I_CACHE_SERVICE)
    private readonly cacheService: ICacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const path = request.path ?? request.url;

    // 1. 检查是否在白名单中 (直接放行，不解析Token)
    if (WhitelistAuth.isWhitelistedPath(path)) {
      return true;
    }

    // 2. 检查是否是 @Public 路由 (允许不登录，但如果有Token会尝试解析)
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 3. 获取 Token
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      if (isPublic) {
        return true;
      }
      throw BusinessExceptionFactory.unauthorized('未提供认证令牌');
    }

    try {
      // 4. 验证 Token (包括签名和过期时间)
      // verifyAsync 会自动检查 exp，如果过期会抛出 TokenExpiredError
      const payload = await this.jwtService.verifyAsync<
        CurrentUser & { jti: string; exp?: number; iat?: number }
      >(token, {
        secret: this.appConfig.jwtOptions.secret,
        algorithms: ['HS256'],
        clockTolerance: 5, // 允许5秒时间差，解决时钟不同步问题
      });

      // 5. 检查 Token 黑名单
      const isBlacklisted = await this.cacheService.get(
        `${CACHE_PREFIXES.BLACKLIST}${payload.authId}:${payload.jti}`,
      );
      if (isBlacklisted) {
        BusinessExceptionFactory.unauthorized('Token无效或已过期');
      }

      // 6. 检查数据库用户状态
      // 使用轻量级方法仅获取状态信息，避免关联查询 User 和 Role 表
      const authInfo = await this.authService.getAuthStatusById(payload.authId);
      if (authInfo?.status !== Status.ENABLED) {
        BusinessExceptionFactory.forbidden('账号访问', {
          message: '账号已被禁用或不存在',
          authId: payload.authId,
        });
      }
      if (this.authService.isAccountLocked(authInfo)) {
        BusinessExceptionFactory.forbidden('账号访问', {
          message: '账号已被锁定',
          authId: payload.authId,
        });
      }

      // 7. 检查密码是否修改（使旧令牌失效）
      if (authInfo.passwordChangedAt) {
        // 将数据库时间转换为 Unix 时间戳（秒）
        const passwordChangedTimestamp = Math.floor(authInfo.passwordChangedAt.getTime() / 1000);
        // 如果密码修改时间晚于令牌签发时间，则令牌失效
        // iat 是令牌签发时间（秒）
        if (payload.iat && passwordChangedTimestamp > payload.iat) {
          BusinessExceptionFactory.unauthorized('密码已修改，请重新登录');
        }
      }

      // 8. 注入用户信息到请求对象（优先使用 JWT 载荷信息）
      // 注意：由于 authInfo 是轻量级对象，可能不包含 user 和 roles，所以必须依赖 payload 或回退到默认值
      const roles: SystemRoles[] =
        payload.roles && payload.roles.length > 0
          ? (payload.roles as SystemRoles[])
          : [SystemRoles.USER]; // 如果 payload 没有角色且 authInfo 也没关联角色，则给予默认权限

      request['user'] = {
        authId: payload.authId,
        userId: payload.userId,
        username: payload.username,
        roles,
        lastLoginAt: authInfo.lastLoginAt,
      };

      // 仅在开发环境或调试时打印用户信息
      if (!this.appConfig.isProduction) {
        this.logger.debug(`认证成功用户: ${payload.username}/${authInfo.id}`);
      }

      return true;
    } catch (e: unknown) {
      const error = e as Error;
      // 如果是 @Public 路由，忽略所有认证错误
      if (isPublic) {
        return true;
      }

      // 处理特定错误
      if (error.name === 'TokenExpiredError') {
        // 仅调试模式打印，避免生产环境日志刷屏
        if (!this.appConfig.isProduction) {
          this.logger.debug(`Token已过期: ${error.message}`);
        }
        throw BusinessExceptionFactory.unauthorized('令牌已过期');
      }

      this.logger.error(`认证失败: ${error.message}`, error.stack);
      throw BusinessExceptionFactory.unauthorized('认证失败');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === JWT_CONSTANTS.TOKEN_PREFIX ? token : undefined;
  }
}
