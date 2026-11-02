import { JWT_CONSTANTS, TOKEN_TYPES } from '../constants/index.js';
import { isValidRole, type Role } from '../enums/index.js';
import { BusinessException } from '../exceptions/index.js';
import type { AppRequest } from '../interfaces/index.js';
import { AppConfigService } from '../../config/index.js';
import { TokenVersionService } from '../../shared/auth-token/index.js';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from '../decorators/index.js';

/**
 * 访问令牌声明
 *
 * 与 `AuthService` 签发处保持一致；任一字段缺失都视为非法令牌，
 * 不做「缺省按普通用户处理」之类的兼容兜底。
 */
interface AccessTokenClaims {
  authId: string;
  userId: string;
  username: string;
  role: Role;
  /** 令牌版本，用于吊销校验 */
  ver: number;
  typ: string;
}

/**
 * JWT 认证守卫
 *
 * 1. 校验签名与有效期；
 * 2. 校验令牌用途（只接受 `typ=access`，刷新令牌不可当访问令牌用）；
 * 3. 校验声明完整性；
 * 4. 通过 `TokenVersionService` 校验令牌版本与账号状态（带 TTL 缓存），
 *    使改密 / 禁用 / 改角色后旧令牌尽快失效；
 * 5. 注入 `request.user`，角色以数据库为准。
 *
 * 公开路由（`@Public()`）不执行第 4 步，避免为匿名接口引入额外查询。
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly appConfig: AppConfigService,
    private readonly tokenVersionService: TokenVersionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AppRequest>();
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const token = this.extractTokenFromHeader(request);
    if (!token) {
      if (isPublic) return true;
      throw BusinessException.unauthorized('未提供认证令牌');
    }

    const claims = await this.verify(token, isPublic);

    // 公开路由：令牌合法则注入身份，非法则按匿名处理（不查库、不报错）
    if (!claims) return true;

    if (isPublic) {
      request.user = {
        authId: claims.authId,
        userId: claims.userId,
        username: claims.username,
        role: claims.role,
      };
      return true;
    }

    // 令牌版本 + 账号状态校验（角色取库中最新的值）
    const state = await this.tokenVersionService.assertTokenValid(claims.authId, claims.ver);

    request.user = {
      authId: claims.authId,
      userId: claims.userId,
      username: claims.username,
      role: state.role,
    };

    return true;
  }

  /**
   * 校验签名、用途与声明完整性
   * @param token 原始令牌
   * @param isPublic 是否公开路由（公开路由校验失败返回 null 而不抛错）
   * @returns 合法时返回声明，非法时返回 null 或抛出 401
   */
  private async verify(token: string, isPublic: boolean): Promise<AccessTokenClaims | null> {
    let payload: Partial<AccessTokenClaims> & { typ?: string };

    try {
      payload = await this.jwtService.verifyAsync<Partial<AccessTokenClaims> & { typ?: string }>(
        token,
        {
          secret: this.appConfig.jwtOptions.secret,
          algorithms: ['HS256'],
          clockTolerance: 5, // 容忍 5 秒时钟偏差
        },
      );
    } catch (error) {
      if (isPublic) return null;

      const reason = error instanceof Error ? error.name : 'UnknownError';
      if (reason === 'TokenExpiredError') {
        if (!this.appConfig.isProduction) {
          this.logger.debug('访问令牌已过期');
        }
        throw BusinessException.unauthorized('令牌已过期');
      }

      this.logger.warn(`认证失败: ${reason}`);
      throw BusinessException.unauthorized('认证失败');
    }

    if (!isAccessClaims(payload)) {
      if (isPublic) return null;
      throw BusinessException.unauthorized('令牌无效，请重新登录');
    }

    return payload;
  }

  private extractTokenFromHeader(request: AppRequest): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === JWT_CONSTANTS.TOKEN_PREFIX ? token : undefined;
  }
}

/**
 * 类型守卫：访问令牌声明是否完整
 *
 * 使用 `typ` 区分用途，并强制要求 `ver`（令牌版本）存在，
 * 避免旧格式令牌在缺少吊销校验字段时被放行。
 */
function isAccessClaims(
  payload: Partial<AccessTokenClaims> & { typ?: string },
): payload is AccessTokenClaims {
  return (
    payload.typ === TOKEN_TYPES.ACCESS &&
    typeof payload.authId === 'string' &&
    payload.authId.length > 0 &&
    typeof payload.userId === 'string' &&
    payload.userId.length > 0 &&
    typeof payload.username === 'string' &&
    payload.username.length > 0 &&
    isValidRole(payload.role) &&
    typeof payload.ver === 'number'
  );
}
