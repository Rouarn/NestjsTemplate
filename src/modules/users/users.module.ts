import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@/shared/cache';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { Auth } from '@/modules/auth/entities/auth.entity';

/**
 * 用户模块（UsersModule）
 *
 * 专门负责用户资料管理的独立模块，与认证功能完全分离。
 * 提供用户信息的CRUD操作、状态管理和批量操作功能。
 *
 * 模块组成：
 * - UsersController: 用户管理的REST API控制器
 * - UsersService: 用户业务逻辑服务
 * - User Entity: 用户资料数据实体
 *
 * 依赖模块：
 * - TypeOrmModule: 数据库ORM支持
 * - CacheModule: 缓存服务支持
 *
 * 导出服务：
 * - UsersService: 供其他模块使用的用户服务
 *
 * 设计特点：
 * - 职责单一：仅处理用户资料相关业务
 * - 高内聚：相关功能集中在一个模块内
 * - 低耦合：与认证模块通过实体关系松耦合
 * - 可复用：服务可被其他模块导入使用
 *
 * 使用场景：
 * - 用户资料管理界面
 * - 用户信息查询和展示
 * - 管理员用户管理功能
 * - 其他模块需要用户信息时
 */
@Module({
  imports: [
    // 注册User实体和Auth实体到TypeORM
    TypeOrmModule.forFeature([User, Auth]),
    // 导入缓存模块，支持用户信息缓存
    CacheModule,
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
