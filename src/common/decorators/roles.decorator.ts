import type { CustomDecorator } from '@nestjs/common';
import { SetMetadata } from '@nestjs/common';
import type { Role } from '../enums/index.js';

/**
 * 角色元数据键，供全局 `RolesGuard` 通过 Reflector 读取
 */
export const ROLES_KEY = 'auth:roles';

/**
 * 接口级角色限制
 *
 * 用法：
 * ```ts
 * @Roles(Role.ADMIN)
 * @Get()
 * findAll() { ... }
 * ```
 * 未标注该装饰器的路由不额外校验角色（仍受全局 JWT 认证保护）。
 * 方法级声明优先于类级声明。
 *
 * @param roles 允许访问的角色集合（命中任意一个即通过）
 */
export const Roles = (...roles: Role[]): CustomDecorator => SetMetadata(ROLES_KEY, roles);
