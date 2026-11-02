import { DEFAULT_PAGINATION } from '../../common/constants/index.js';
import { Status, toggleStatus } from '../../common/enums/index.js';
import { BusinessException } from '../../common/exceptions/index.js';
import type { PaginatedData } from '../../common/interfaces/index.js';
import { DatabaseService } from '../../database/index.js';
import { Auth } from '../auth/entities/auth.entity.js';
import { TokenVersionService } from '../../shared/auth-token/index.js';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type { BatchDeleteUserDto } from './dto/batch-delete-user.dto.js';
import type { QueryUserDto } from './dto/query-user.dto.js';
import type { UpdateUserDto } from './dto/update-user.dto.js';
import { User } from './entities/user.entity.js';

/**
 * 转义 LIKE 通配符
 *
 * 用户输入的 `%` / `_` / `\` 必须按字面量匹配，否则 `%` 会退化为「匹配全部」，
 * 既影响语义也会放大扫描范围。
 */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/**
 * 用户服务
 *
 * 负责用户资料的 CRUD、分页查询与状态管理。
 * 账号状态实际存放在认证表上，变更后通过 `TokenVersionService` 递增令牌版本，
 * 使该账号已签发的令牌尽快失效。
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Auth)
    private readonly authRepository: Repository<Auth>,
    private readonly databaseService: DatabaseService,
    private readonly tokenVersionService: TokenVersionService,
  ) {}

  /**
   * 分页查询用户
   *
   * 直接返回最终的 `PaginatedData`，拦截器不再做任何分页推断。
   */
  async findAll(queryDto: QueryUserDto): Promise<PaginatedData<User>> {
    const { nickname, email, status } = queryDto;
    const current = queryDto.current ?? DEFAULT_PAGINATION.MIN_PAGE;
    const size = queryDto.size ?? DEFAULT_PAGINATION.DEFAULT_PAGE_SIZE;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.auth', 'auth');

    if (nickname) {
      queryBuilder.andWhere('user.nickname LIKE :nickname', {
        nickname: `%${escapeLike(nickname)}%`,
      });
    }
    if (email) {
      queryBuilder.andWhere('user.email LIKE :email', { email: `%${escapeLike(email)}%` });
    }
    if (status !== undefined) {
      queryBuilder.andWhere('auth.status = :status', { status });
    }

    const [records, total] = await queryBuilder
      .orderBy('user.createdAt', 'DESC')
      .skip((current - 1) * size)
      .take(size)
      .getManyAndCount();

    return {
      records,
      total,
      totalPages: Math.ceil(total / size),
      current,
      size,
    };
  }

  /** 按 ID 查询用户（含认证信息，用于内部判定） */
  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { auth: true },
    });

    if (!user) {
      throw BusinessException.notFound('用户不存在', { id });
    }

    return user;
  }

  /** 更新用户资料 */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existing = await this.userRepository.findOne({
        where: { email: updateUserDto.email },
      });
      if (existing && existing.id !== id) {
        throw BusinessException.conflict('邮箱已被使用', { email: updateUserDto.email });
      }
    }

    // birthday 在 DTO 中为日期字符串，入库前显式转换；空串已由 DTO 转为 null
    const { birthday, ...profileFields } = updateUserDto;
    Object.assign(user, profileFields);
    if (birthday !== undefined) {
      user.birthday = birthday === null ? null : new Date(birthday);
    }

    await this.userRepository.save(user);

    return await this.findById(id);
  }

  /**
   * 切换账号启用状态
   *
   * 状态存放在认证表；变更后递增令牌版本，被禁用账号的会话立即失效。
   */
  async toggleUserStatus(id: string, status?: Status): Promise<User> {
    const user = await this.findById(id);

    if (!user.auth) {
      throw BusinessException.notFound('用户认证信息不存在', { id, hasAuth: false });
    }

    user.auth.status = status ?? toggleStatus(user.auth.status);
    await this.authRepository.update(user.auth.id, { status: user.auth.status });
    await this.tokenVersionService.bump(user.auth.id);

    return user;
  }

  /** 删除单个用户 */
  async remove(id: string): Promise<{ message: string }> {
    const user = await this.findById(id);
    await this.executeDeleteUsers([user]);
    return { message: '用户删除成功' };
  }

  /**
   * 批量删除用户
   *
   * 返回实际删除与不存在的 ID，前端可据此提示部分失败，
   * 而不是像旧实现那样静默忽略并回报一个含糊的「成功删除 N 个」。
   */
  async batchRemove(
    batchDeleteDto: BatchDeleteUserDto,
  ): Promise<{ deleted: string[]; missing: string[] }> {
    const { ids } = batchDeleteDto;
    const uniqueIds = [...new Set(ids)];

    const users = await this.userRepository.find({
      where: { id: In(uniqueIds) },
      relations: { auth: true },
    });

    if (users.length === 0) {
      throw BusinessException.notFound('要删除的用户不存在', { ids: uniqueIds });
    }

    await this.executeDeleteUsers(users);

    const deleted = users.map((user) => user.id);
    const missing = uniqueIds.filter((id) => !deleted.includes(id));

    return { deleted, missing };
  }

  /**
   * 事务内删除用户及其认证记录
   *
   * 认证记录删除后对应令牌自然失效（版本查询返回空），同时清理进程内缓存。
   */
  private async executeDeleteUsers(users: User[]): Promise<void> {
    if (users.length === 0) return;

    const authsToDelete = users.map((user) => user.auth).filter((auth) => !!auth);

    await this.databaseService.getDataSource().transaction(async (manager) => {
      await manager.remove(users);
      if (authsToDelete.length > 0) {
        await manager.remove(authsToDelete);
      }
    });

    for (const auth of authsToDelete) {
      this.tokenVersionService.invalidate(auth.id);
    }
  }
}
