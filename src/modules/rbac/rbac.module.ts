import { User } from '@/modules/users/entities/user.entity';
import { CacheModule } from '@/shared/cache';
import { Global, Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Auth } from '../auth/entities/auth.entity';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';
import { PermissionsGuard } from './guards/permissions.guard';
import { RolesGuard } from './guards/roles.guard';
import { RbacService } from './services/rbac.service';

import { RbacController } from './controllers/rbac.controller';
import { RbacBootstrapService } from './services/rbac-bootstrap.service';

/**
 * RBAC 模块
 *
 * 提供角色、权限相关的实体、服务、控制器和守卫，
 * 并在应用启动时初始化系统预置的角色、权限和默认用户。
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Role, Permission, User, Auth]),
    CacheModule,
    forwardRef(() => AuthModule),
  ],
  controllers: [RbacController],
  providers: [RbacService, RbacBootstrapService, PermissionsGuard, RolesGuard],
  exports: [RbacService, PermissionsGuard, RolesGuard],
})
export class RbacModule {}
