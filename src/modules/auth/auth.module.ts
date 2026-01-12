import { CacheModule } from '@/shared/cache';
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RbacModule } from '../rbac/rbac.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Auth } from './entities/auth.entity';

/**
 * 认证模块（AuthModule）
 *
 * 专注于用户认证相关功能，与用户管理模块完全分离
 *
 * 模块职责：
 * - 用户登录认证和JWT令牌管理
 * - 用户注册和密码管理
 * - 验证码生成和验证
 * - 登录安全控制（失败次数限制、账号锁定）
 * - 令牌刷新和撤销
 *
 * 模块组成：
 * - AuthController: 认证相关的REST API接口
 * - AuthService: 认证业务逻辑服务
 * - Auth实体: 认证信息数据模型
 *
 * 依赖关系：
 * - TypeORM: Auth和User实体的数据库操作
 * - CacheModule: 缓存服务（验证码、令牌、用户信息）
 * - UsersModule: 用户管理服务协作（forwardRef避免循环依赖）
 *
 * 设计特点：
 * - 认证与用户管理职责分离
 * - Auth实体专注认证信息存储
 * - 通过UsersService协作处理用户资料
 * - 支持一对一关联到User实体
 * - 完整的安全控制机制
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Auth]),
    CacheModule,
    UsersModule,
    forwardRef(() => RbacModule),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService, TypeOrmModule],
})
export class AuthModule {}
