import { applyDecorators, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/index.js';

/**
 * JWT 认证装饰器（JwtAuth）
 *
 * 用于快速为控制器或路由方法添加 JWT 认证保护。
 *
 * @returns 应用了 JwtAuthGuard 的装饰器组合
 */
export function JwtAuth(): MethodDecorator & ClassDecorator {
  return applyDecorators(UseGuards(JwtAuthGuard));
}
