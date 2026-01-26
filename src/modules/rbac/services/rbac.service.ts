import { CACHE_PREFIXES, CACHE_TOKENS } from '@/common/constants';
import { BusinessExceptionFactory } from '@/common/exceptions';
import { User } from '@/modules/users/entities/user.entity';
import { ICacheService } from '@/shared/cache/interfaces';
import { ExportResult, ImportExportService, SupportedFormat } from '@/shared/import-export';
import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { DEFAULT_SYSTEM_ROLES, SystemRoles } from '../constants/system-roles.constant';
import { CreatePermissionDto } from '../dto/create-permission.dto';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { Permission } from '../entities/permission.entity';
import { Role } from '../entities/role.entity';

export interface RoleImportItem {
  name: string;
  alias: string;
  description?: string;
  isSystem?: boolean | string;
}

export interface RoleImportResult {
  success: number;
  failed: number;
  errors: {
    row: RoleImportItem;
    message: string;
  }[];
}

/**
 * RBAC 核心服务
 *
 * 负责角色、权限的增删改查，以及用户与角色、角色与权限之间的绑定关系。
 * 同时对用户权限进行缓存，加速鉴权流程。
 */
@Injectable()
export class RbacService {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @Inject(CACHE_TOKENS.I_CACHE_SERVICE)
    private cacheService: ICacheService,
  ) {}

  private readonly importExportService = new ImportExportService();

  /**
   * 导出角色数据
   */
  async exportRoles(format: SupportedFormat = 'xlsx'): Promise<ExportResult> {
    const roles = await this.findAllRoles();
    const data = roles.map((role) => ({
      name: role.name,
      alias: role.alias,
      description: role.description,
      isSystem: role.isSystem ? '是' : '否',
    }));

    return this.importExportService.exportToFile(data, {
      format,
      mapping: {
        name: '角色标识',
        alias: '角色名称',
        description: '描述',
        isSystem: '是否系统内置',
      },
      sheetName: '角色列表',
      fileName: `角色列表_${new Date().toISOString().split('T')[0]}`,
    });
  }

  /**
   * 导入角色数据
   */
  async importRoles(file: Express.Multer.File): Promise<RoleImportResult> {
    const result = await this.importExportService.importFromFile<RoleImportItem>(file, {
      mapping: {
        name: '角色标识',
        alias: '角色名称',
        description: '描述',
        isSystem: '是否系统内置',
      },
    });

    const importResult: RoleImportResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    const data = result.data;

    for (let i = 0; i < data.length; i++) {
      const item = data[i];

      try {
        if (!item.name || !item.alias) {
          throw new Error('角色标识和名称不能为空');
        }

        const isSystem = item.isSystem === '是';
        let role = await this.roleRepository.findOne({ where: { name: item.name } });

        if (role) {
          // 更新
          role.alias = item.alias;
          role.description = item.description ?? '';
          // 系统内置属性通常不建议通过导入修改，但这里保持同步
          // role.isSystem = isSystem;
          await this.roleRepository.save(role);
        } else {
          // 创建
          role = this.roleRepository.create({
            name: item.name,
            alias: item.alias,
            description: item.description,
            isSystem,
          });
          await this.roleRepository.save(role);
        }
        importResult.success++;
      } catch (error: unknown) {
        importResult.failed++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        importResult.errors.push({
          row: item,
          message: errorMessage,
        });
      }
    }

    return importResult;
  }

  /**
   * 获取默认角色 (通常是 User)
   *
   * 如果数据库中不存在默认角色，将以系统预置配置为模板创建一条记录。
   */
  async getDefaultRole(): Promise<Role> {
    let role = await this.roleRepository.findOne({ where: { name: SystemRoles.USER } });
    if (!role) {
      // 如果不存在，尝试创建默认角色 (仅用于初始化防止报错，实际应通过 Seed 数据)
      role = this.roleRepository.create(DEFAULT_SYSTEM_ROLES[2]);
      await this.roleRepository.save(role);
    }
    return role;
  }

  /**
   * 获取用户的所有权限
   *
   * 会优先读取缓存，若无缓存则从数据库聚合用户所有角色的权限后写入缓存。
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    const cacheKey = `${CACHE_PREFIXES.RBAC_USER_PERMISSIONS}${userId}`;
    const cached = await this.cacheService.get<string[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles', 'roles.permissions'],
    });

    if (!user?.roles) {
      return [];
    }

    const permissions = new Set<string>();
    for (const role of user.roles) {
      if (role.permissions) {
        role.permissions.forEach((p) => permissions.add(p.name));
      }
    }
    const result = Array.from(permissions);

    // 缓存 1 小时
    await this.cacheService.set(cacheKey, result, { ttl: 3600 });
    return result;
  }

  /**
   * 获取用户的所有角色标识
   */
  async getUserRoles(userId: string): Promise<string[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });
    if (!user?.roles) return [];
    return user.roles.map((r) => r.name);
  }

  /**
   * 查询系统中所有权限
   */
  async findAllPermissions(): Promise<Permission[]> {
    return this.permissionRepository.find();
  }

  /**
   * 创建角色
   */
  async createRole(dto: CreateRoleDto): Promise<Role> {
    const role = this.roleRepository.create(dto);
    return this.roleRepository.save(role);
  }

  /**
   * 查询所有角色（包含已分配的权限）
   */
  async findAllRoles(): Promise<Role[]> {
    return this.roleRepository.find({ relations: ['permissions'] });
  }

  /**
   * 更新角色信息
   */
  async updateRole(id: string, dto: UpdateRoleDto): Promise<Role> {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) {
      throw BusinessExceptionFactory.notFound('Role', { id });
    }
    Object.assign(role, dto);
    await this.roleRepository.save(role);

    // 清除缓存
    await this.clearCacheForRole(id);

    return role;
  }

  /**
   * 删除角色
   *
   * 删除前会先清理相关用户的权限缓存。
   */
  async deleteRole(id: string): Promise<void> {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) {
      throw BusinessExceptionFactory.notFound('角色', { id });
    }

    // 清除缓存
    await this.clearCacheForRole(id);

    await this.roleRepository.remove(role);
  }

  /**
   * 创建权限
   */
  async createPermission(dto: CreatePermissionDto): Promise<Permission> {
    const permission = this.permissionRepository.create(dto);
    return this.permissionRepository.save(permission);
  }

  /**
   * 为角色分配权限
   *
   * 会覆盖原有权限集合，并清除所有拥有该角色的用户的权限缓存。
   */
  async assignPermissions(roleId: string, permissionIds: string[]): Promise<Role> {
    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw BusinessExceptionFactory.notFound('角色', { id: roleId });
    }

    role.permissions = await this.permissionRepository.find({ where: { id: In(permissionIds) } });

    // 清除拥有该角色的用户的权限缓存
    await this.clearCacheForRole(roleId);

    return this.roleRepository.save(role);
  }

  /**
   * 为用户分配角色
   *
   * 会覆盖原有角色集合，并清除对应用户的权限缓存。
   */
  async assignRolesToUser(userId: string, roleIds: string[]): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw BusinessExceptionFactory.notFound('User');
    }

    user.roles = await this.roleRepository.find({ where: { id: In(roleIds) } });

    // 清除用户的权限缓存
    await this.cacheService.del(`${CACHE_PREFIXES.RBAC_USER_PERMISSIONS}${userId}`);

    return this.userRepository.save(user);
  }

  /**
   * 清除指定角色的所有用户的权限缓存
   */
  private async clearCacheForRole(roleId: string): Promise<void> {
    // 查找所有拥有该角色的用户
    const users = await this.userRepository.find({
      where: { roles: { id: roleId } },
      select: ['id'],
    });

    if (users.length > 0) {
      const keys = users.map((u) => `${CACHE_PREFIXES.RBAC_USER_PERMISSIONS}${u.id}`);
      await this.cacheService.delMany(keys);
    }
  }
}
