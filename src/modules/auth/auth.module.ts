import { DatabaseModule } from '#/database/index.js';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { Auth } from './entities/auth.entity.js';

/**
 * 认证模块（AuthModule）
 *
 * 专注于用户认证相关功能，与用户管理模块完全分离
 */
@Module({
  imports: [TypeOrmModule.forFeature([Auth]), DatabaseModule, UsersModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService, TypeOrmModule],
})
export class AuthModule {}
