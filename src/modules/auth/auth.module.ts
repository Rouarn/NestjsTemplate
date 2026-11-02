import { DatabaseModule } from '../../database/index.js';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { Auth } from './entities/auth.entity.js';

/**
 * 认证模块（AuthModule）
 *
 * 负责登录、注册、验证码、改密等认证能力；
 * 复用 UsersModule 查询用户资料，不反向被用户模块依赖。
 */
@Module({
  imports: [TypeOrmModule.forFeature([Auth]), DatabaseModule, UsersModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
