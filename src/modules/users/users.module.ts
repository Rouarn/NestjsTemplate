import { DatabaseModule } from '#/database/index.js';
import { Auth } from '#/modules/auth/entities/auth.entity.js';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

/**
 * 用户模块（UsersModule）
 *
 * 专门负责用户资料管理的独立模块，与认证功能完全分离。
 * 提供用户信息的CRUD操作、状态管理和批量操作功能。
 */
@Module({
  imports: [
    // 注册User实体和Auth实体到TypeORM
    TypeOrmModule.forFeature([User, Auth]),
    // 导入数据库模块，提供原生连接访问
    DatabaseModule,
  ],
  controllers: [
    // 用户管理API控制器
    UsersController,
  ],
  providers: [
    // 用户业务逻辑服务
    UsersService,
  ],
  exports: [
    // 导出用户服务，供其他模块使用
    UsersService,
    // 导出TypeORM仓库，供其他模块直接使用（如果需要）
    TypeOrmModule,
  ],
})
export class UsersModule {}
