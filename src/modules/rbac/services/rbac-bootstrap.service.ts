import { AppConfigService } from '@/config';
import { Auth } from '@/modules/auth/entities/auth.entity';
import { User } from '@/modules/users/entities/user.entity';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { In, Repository } from 'typeorm';
import { DEFAULT_PERMISSIONS, PermissionAction } from '../constants/permission.constant';
import {
  DEFAULT_SYSTEM_ROLES,
  DEFAULT_SYSTEM_USERS,
  SystemRoles,
} from '../constants/system-roles.constant';
import { Permission } from '../entities/permission.entity';
import { Role } from '../entities/role.entity';

/**
 * RBAC 启动引导服务
 *
 * 在应用模块初始化时，负责检查并初始化权限、角色、默认用户以及角色权限映射，
 * 确保系统在全新环境下也能自动具备最基本地访问控制能力。
 */
@Injectable()
export class RbacBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(RbacBootstrapService.name);

  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Auth)
    private readonly authRepository: Repository<Auth>,
    private readonly appConfig: AppConfigService,
  ) {}

  /**
   * 模块初始化生命周期钩子
   *
   * 会依次初始化权限、角色、默认用户，并建立权限分配关系。
   */
  async onModuleInit(): Promise<void> {
    this.logger.log('检查和初始化RBAC系统数据...');
    await this.initPermissions();
    await this.initRoles();
    await this.initUsers();
    await this.assignPermissionsToRoles();
    this.logger.log('RBAC系统数据初始化完成。');
  }

  /**
   * 初始化权限数据
   */
  private async initPermissions(): Promise<void> {
    for (const p of DEFAULT_PERMISSIONS) {
      const exists = await this.permissionRepository.findOne({ where: { name: p.name } });
      if (!exists) {
        this.logger.log(`创建权限: ${p.name}`);
        const permission = this.permissionRepository.create({
          name: p.name,
          description: p.description,
          group: p.group,
        });
        await this.permissionRepository.save(permission);
      }
    }
  }

  /**
   * 初始化角色数据
   */
  private async initRoles(): Promise<void> {
    for (const r of DEFAULT_SYSTEM_ROLES) {
      const exists = await this.roleRepository.findOne({ where: { name: r.name } });
      if (!exists) {
        this.logger.log(`创建系统角色: ${r.name}`);
        const role = this.roleRepository.create(r);
        await this.roleRepository.save(role);
      }
    }
  }

  /**
   * 初始化默认用户
   */
  private async initUsers(): Promise<void> {
    for (const u of DEFAULT_SYSTEM_USERS) {
      // 检查 Auth 是否存在 (用户名唯一)
      const exists = await this.authRepository.findOne({ where: { username: u.username } });
      if (!exists) {
        this.logger.log(`创建默认用户: ${u.username}`);

        // 1. 获取角色实体
        const roles = await this.roleRepository.findBy({
          name: In(u.roles),
        });

        if (roles.length !== u.roles.length) {
          this.logger.warn(
            `用户 ${u.username} 角色中有些角色不存在。预期: ${u.roles.join(', ')}, 找到: ${roles.map((r) => r.name).join(', ')}`,
          );
        }

        // 2. 创建 Auth
        const salt = bcrypt.genSaltSync(this.appConfig.bcryptSaltRounds);
        const hashedPassword = bcrypt.hashSync(String(u.password), salt);

        const auth = this.authRepository.create({
          username: u.username,
          password: hashedPassword,
          salt,
          passwordChangedAt: new Date(),
          loginAttempts: 0,
        });
        const savedAuth = await this.authRepository.save(auth);

        // 3. 创建 User
        const user = this.userRepository.create({
          auth: savedAuth,
          nickname: u.nickname,
          email: u.email,
          roles: roles,
        });
        await this.userRepository.save(user);
      }
    }
  }

  /**
   * 分配默认权限给系统角色
   */
  private async assignPermissionsToRoles(): Promise<void> {
    // 1. 系统管理员：拥有所有权限
    const systemAdmin = await this.roleRepository.findOne({
      where: { name: SystemRoles.ADMIN },
      relations: { permissions: true },
    });

    if (systemAdmin) {
      const allPermissions = await this.permissionRepository.find();
      const currentPermissionIds = new Set(systemAdmin.permissions?.map((p) => p.id) || []);

      // 检查是否拥有所有权限
      const missingAny = allPermissions.some((p) => !currentPermissionIds.has(p.id));

      if (missingAny) {
        this.logger.log(`更新 ${SystemRoles.ADMIN} 角色权限: 确保拥有所有权限`);
        // 系统管理员应拥有所有权限
        systemAdmin.permissions = allPermissions;
        await this.roleRepository.save(systemAdmin);
      }
    }

    // 2. 内容管理员 (EDITOR)：作为示例，这里暂时赋予其与普通用户相同的权限，或者未来的内容管理权限
    // 由于目前没有内容模块，我们暂时只分配基础权限，或者留空等待后续模块添加
    // 实际项目中，这里应该分配 'article:*', 'book:*' 等权限
    const editor = await this.roleRepository.findOne({
      where: { name: SystemRoles.EDITOR },
      relations: { permissions: true },
    });

    if (editor) {
      // 暂时只给 EDITOR 赋予 USER 相关的只读权限作为演示，或者保持为空
      // 这里为了演示逻辑，假设 EDITOR 至少应该能查看用户列表（视具体需求而定）
      // 在真实场景中，可以分配 `PermissionAction.USER_READ` 等
      const targetPermissions = await this.permissionRepository.find({
        where: [
          // 示例：仅分配用户相关权限
          {
            name: In([
              PermissionAction.USER_READ,
              PermissionAction.USER_CREATE,
              PermissionAction.USER_UPDATE,
              PermissionAction.USER_DELETE,
            ]),
          },
        ],
      });

      const currentPermissionIds = new Set(editor.permissions?.map((p) => p.id) || []);
      const missingPermissions = targetPermissions.filter((tp) => !currentPermissionIds.has(tp.id));

      if (missingPermissions.length > 0) {
        this.logger.log(
          `更新 ${SystemRoles.EDITOR} 角色权限: 添加 ${missingPermissions.length} 缺失权限`,
        );
        editor.permissions = [...(editor.permissions || []), ...missingPermissions];
        await this.roleRepository.save(editor);
      }
    }
  }
}
