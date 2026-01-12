import { CACHE_PREFIXES, CACHE_TOKENS } from '@/common/constants';
import { BusinessExceptionFactory } from '@/common/exceptions';
import { User } from '@/modules/users/entities/user.entity';
import { ICacheService } from '@/shared/cache/interfaces';
import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { SystemRoles } from '../constants/system-roles.constant';
import { CreatePermissionDto } from '../dto/create-permission.dto';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { Permission } from '../entities/permission.entity';
import { Role } from '../entities/role.entity';

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

  /**
   * 获取默认角色 (通常是 User)
   */
  async getDefaultRole(): Promise<Role> {
    let role = await this.roleRepository.findOne({ where: { name: SystemRoles.USER } });
    if (!role) {
      // 如果不存在，尝试创建默认角色 (仅用于初始化防止报错，实际应通过 Seed 数据)
      role = this.roleRepository.create({
        name: SystemRoles.USER,
        alias: '标准用户',
        description: '系统默认的标准用户角色',
        isSystem: true,
      });
      await this.roleRepository.save(role);
    }
    return role;
  }

  /**
   * 获取用户的所有权限
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

  async findAllPermissions(): Promise<Permission[]> {
    return this.permissionRepository.find();
  }

  async createRole(dto: CreateRoleDto): Promise<Role> {
    const role = this.roleRepository.create(dto);
    return this.roleRepository.save(role);
  }

  async findAllRoles(): Promise<Role[]> {
    return this.roleRepository.find({ relations: ['permissions'] });
  }

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

  async deleteRole(id: string): Promise<void> {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) {
      throw BusinessExceptionFactory.notFound('Role', { id });
    }

    // 清除缓存
    await this.clearCacheForRole(id);

    await this.roleRepository.remove(role);
  }

  async createPermission(dto: CreatePermissionDto): Promise<Permission> {
    const permission = this.permissionRepository.create(dto);
    return this.permissionRepository.save(permission);
  }

  async assignPermissions(roleId: string, permissionIds: string[]): Promise<Role> {
    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw BusinessExceptionFactory.notFound('Role', { id: roleId });
    }
    const permissions = await this.permissionRepository.find({ where: { id: In(permissionIds) } });
    role.permissions = permissions;

    // 清除拥有该角色的用户的权限缓存
    await this.clearCacheForRole(roleId);

    return this.roleRepository.save(role);
  }

  async assignRolesToUser(userId: string, roleIds: string[]): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw BusinessExceptionFactory.notFound('User');
    }
    const roles = await this.roleRepository.find({ where: { id: In(roleIds) } });
    user.roles = roles;

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
