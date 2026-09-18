import { Status, toggleStatus } from '@/common/enums';
import { BusinessExceptionFactory } from '@/common/exceptions';
import { DatabaseService } from '@/database';
import { Auth } from '@/modules/auth/entities/auth.entity';
import { Injectable } from '@nestjs/common';
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
 *
 * 精简说明：移除了缓存层，用户查询直接读取数据库。
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Auth)
    private readonly authRepository: Repository<Auth>,
    private readonly databaseService: DatabaseService,
  ) {}

  /**
   * 获取所有用户（带分页）
   * @returns 用户列表和总数
   * @param queryDto
   *
   */
  async findAll(queryDto: QueryUserDto): Promise<{ list: User[]; total: number }> {
    const { current, size, nickname, email, status } = queryDto;
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.auth', 'auth');

    if (nickname) {
      queryBuilder.andWhere('user.nickname LIKE :nickname', { nickname: `%${nickname}%` });
    }
    if (email) {
      queryBuilder.andWhere('user.email LIKE :email', { email: `%${email}%` });
    }
    if (status !== undefined) {
      queryBuilder.andWhere('auth.status = :status', { status });
    }

    const page = current ?? 1;
    const pageSize = size ?? 10;

    queryBuilder
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [data, total] = await queryBuilder.getManyAndCount();

    return { list: data, total };
  }

  /**
   * 根据ID获取用户
   * @param id 用户ID
   * @returns 用户信息
   */
  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: { auth: true },
    });

    if (!user) {
      throw BusinessExceptionFactory.notFound('用户', { id });
    }

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

    return user;
  }

  /**
   * 删除用户
   * @param id 用户ID
   * @returns 删除结果消息
   */
  async remove(id: string): Promise<{ message: string }> {
    const user = await this.findById(id);
    await this.executeDeleteUsers([user]);
    return { message: '用户删除成功' };
  }

  /**
   * 批量删除用户
   * @param batchDeleteDto 批量删除DTO
   * @returns 删除结果
   */
  async batchRemove(batchDeleteDto: BatchDeleteUserDto): Promise<{ message: string }> {
    const { ids } = batchDeleteDto;

    const users = await this.userRepository.find({
      where: { id: In(ids) },
      relations: { auth: true },
    });

    if (users.length === 0) {
      throw BusinessExceptionFactory.notFound('要删除的用户', { ids });
    }

    await this.executeDeleteUsers(users);

    return { message: `成功删除 ${users.length} 个用户` };
  }

  /**
   * 执行用户删除逻辑（包含事务）
   * @param users 用户列表
   */
  private async executeDeleteUsers(users: User[]): Promise<void> {
    if (users.length === 0) return;

    // 数据库事务删除
    await this.databaseService.getDataSource().transaction(async (manager) => {
      const authsToDelete = users.map((user) => user.auth).filter((auth) => !!auth);

      // 删除用户
      await manager.remove(users);

      // 删除关联的认证信息
      if (authsToDelete.length > 0) {
        await manager.remove(authsToDelete);
      }
    });
  }
}
