import { DatabaseModule } from '@/database';
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
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Auth]),
    DatabaseModule,
    CacheModule,
    UsersModule,
    forwardRef(() => RbacModule),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService, TypeOrmModule],
})
export class AuthModule {}
