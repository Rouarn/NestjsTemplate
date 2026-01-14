import { CACHE_PREFIXES, CACHE_TOKENS, CACHE_TTL } from '@/common/constants';
import { Status, toggleStatus } from '@/common/enums';
import { BusinessExceptionFactory } from '@/common/exceptions';
import { Auth } from '@/modules/auth/entities/auth.entity';
import { ICacheService } from '@/shared/cache/interfaces';
import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type { BatchDeleteUserDto } from './dto/batch-delete-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

/**
 * 用户服务（UserService）
 *
 * 提供用户信息管理的核心业务逻辑，专注于用户资料的CRUD操作。
 * 与认证功能分离，职责单一明确。
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Auth)
    private readonly authRepository: Repository<Auth>,
    @Inject(CACHE_TOKENS.I_CACHE_SERVICE)
    private readonly cacheService: ICacheService,
  ) {}

  /**
   * 获取所有用户（带分页和缓存）
   * @param current 当前页码
   * @param size 每页数量
   * @returns 用户列表和总数
   */
  async findAll(queryDto: QueryUserDto): Promise<{ list: User[]; total: number }> {
    const { current, size, nickname, email, roles, status } = queryDto;
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.auth', 'auth')
      .leftJoinAndSelect('user.roles', 'roles');

    if (nickname) {
      queryBuilder.where('user.nickname LIKE :nickname', { nickname: `%${nickname}%` });
    }
    if (email) {
      queryBuilder.where('user.email LIKE :email', { email: `%${email}%` });
    }
    if (roles) {
      queryBuilder.where('roles.name IN (:...roles)', { roles });
    }
    if (status !== undefined) {
      queryBuilder.where('user.status = :status', { status });
    }

    if (current && size) {
      queryBuilder
        .orderBy('user.createdAt', 'DESC')
        .skip((current - 1) * size)
        .take(size);
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    return { list: data, total };
  }

  /**
   * 根据ID获取用户（带缓存）
   * @param id 用户ID
   * @returns 用户信息
   */
  async findById(id: string): Promise<User> {
    const cacheKey = `${CACHE_PREFIXES.USER_PROFILE}${id}`;
    const cachedUser = await this.cacheService.get<User>(cacheKey);
    if (cachedUser) {
      return cachedUser;
    }

    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['auth', 'roles'],
    });

    if (!user) {
      throw BusinessExceptionFactory.notFound('用户', { id });
    }

    // 缓存用户信息，设置1小时过期
    await this.cacheService.set(cacheKey, user, { ttl: CACHE_TTL.USER_PROFILE });
    return user;
  }

  /**
   * 更新用户信息
   * @param id 用户ID
   * @param updateUserDto 更新用户DTO
   * @returns 更新后的用户信息
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<void> {
    const user = await this.findById(id);

    // 检查邮箱唯一性
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      });
      if (existingUser && existingUser.id !== id) {
        throw BusinessExceptionFactory.conflict('邮箱已被使用', { email: updateUserDto.email });
      }
    }

    Object.assign(user, updateUserDto);

    await this.userRepository.save(user);
    // 清除缓存
    await this.cacheService.del(`${CACHE_PREFIXES.USER_PROFILE}${id}`);

    return;
  }

  /**
   * 切换用户状态（通过关联的认证实体）
   * 注意：这个方法需要与认证服务协作
   * @param id 用户ID
   * @param status 目标状态
   * @returns 更新后的用户信息
   */
  async toggleUserStatus(id: string, status?: Status): Promise<User> {
    const user = await this.findById(id);

    if (!user.auth) {
      throw BusinessExceptionFactory.notFound('用户认证信息', { id, hasAuth: false });
    }

    // 更新认证状态
    user.auth.status = status ?? toggleStatus(user.auth.status);
    await this.authRepository.update(user.auth.id, { status: user.auth.status });

    // 清除缓存
    await this.cacheService.del(`${CACHE_PREFIXES.USER_PROFILE}${id}`);

    return user;
  }

  /**
   * 删除用户
   * @param id 用户ID
   * @returns 删除结果消息
   */
  async remove(id: string): Promise<{ message: string }> {
    const user = await this.findById(id);
    await this.userRepository.remove(user);
    // 清除缓存
    await this.cacheService.del(`${CACHE_PREFIXES.USER_PROFILE}${id}`);
    return { message: '用户删除成功' };
  }

  /**
   * 批量删除用户
   * @param batchDeleteDto 批量删除DTO
   * @returns 删除结果
   */
  async batchRemove(batchDeleteDto: BatchDeleteUserDto): Promise<{ message: string }> {
    const { ids } = batchDeleteDto;

    const users = await this.userRepository.findBy({ id: In(ids) });
    if (users.length === 0) {
      throw BusinessExceptionFactory.notFound('要删除的用户', { ids });
    }

    await this.userRepository.remove(users);

    // 批量清除缓存
    const cacheKeys = users.map((user) => `${CACHE_PREFIXES.USER_PROFILE}${user.id}`);
    await this.cacheService.delMany(cacheKeys);

    return { message: `成功删除 ${users.length} 个用户` };
  }
}
