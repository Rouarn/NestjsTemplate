import { JWT_CONSTANTS } from '#/common/constants/index.js';
import { BusinessException } from '#/common/exceptions/index.js';
import { AppRequest, CurrentUser } from '#/common/interfaces/index.js';
import { AppConfigService } from '#/config/index.js';
import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from '../decorators/index.js';

/**
 * JwtAuthGuard（JWT 认证守卫）
 *
 * 用于保护需要身份认证的路由，仅做 JWT 校验与用户信息注入。
 * 职责精简后不再耦合业务模块：不查库、不做黑名单、不做账号状态校验。
 * 如需对禁用/锁定账号做二次拦截，请在具体业务接口内按需校验。
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly appConfig: AppConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AppRequest>();

    // 1. 检查是否是 @Public 路由 (允许不登录，但如果有 Token 会尝试解析)
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 2. 获取 Token
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      if (isPublic) {
        return true;
      }
      throw BusinessException.unauthorized('未提供认证令牌');
    }

    try {
      // 3. 验证 Token (包括签名和过期时间)
      // verifyAsync 会自动检查 exp，如果过期会抛出 TokenExpiredError
      const payload = await this.jwtService.verifyAsync<CurrentUser & { jti?: string }>(token, {
        secret: this.appConfig.jwtOptions.secret,
        algorithms: ['HS256'],
        clockTolerance: 5, // 允许5秒时间差，解决时钟不同步问题
      });

      // 4. 注入用户信息到请求对象
      //    赋值后该请求满足 AuthenticatedRequest（user 必填），
      //    后续控制器/参数装饰器阶段可按非空用户直接使用
      request.user = {
        authId: payload.authId,
        userId: payload.userId,
        username: payload.username,
        lastLoginAt: payload.lastLoginAt,
      };

      // 认证成功不再逐条打印用户信息：成功请求由 LoggingInterceptor 的响应出口
      // 统一记录用户信息，失败请求由 AllExceptionsFilter 在结构化日志中留痕，避免重复
      return true;
    } catch (e: unknown) {
      const error = e as Error;
      // 如果是 @Public 路由，忽略所有认证错误
      if (isPublic) {
        return true;
      }

      // 处理特定错误
      if (error.name === 'TokenExpiredError') {
        if (!this.appConfig.isProduction) {
          this.logger.debug(`Token已过期: ${error.message}`);
        }
        throw BusinessException.unauthorized('令牌已过期');
      }

      this.logger.error(`认证失败: ${error.message}`, error.stack);
      throw BusinessException.unauthorized('认证失败');
    }
  }

  private extractTokenFromHeader(request: AppRequest): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === JWT_CONSTANTS.TOKEN_PREFIX ? token : undefined;
  }
}
