import { Role, Status } from '../../../common/enums/index.js';
import { BaseEntity } from '../../../database/index.js';
import type { User } from '../../users/entities/user.entity.js';
import { ApiHideProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 认证实体
 *
 * 专门负责用户认证相关的信息，包括用户名、密码、状态等认证必需的字段。
 * 与用户信息实体通过一对一关系关联，实现认证与用户资料的分离。
 */
@Entity('auth', { comment: '认证信息表' })
export class Auth extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { comment: '认证ID' })
  id!: string;

  @Column({ name: 'username', length: 100, unique: true, comment: '用户名' })
  username!: string;

  // bcrypt 哈希已内嵌盐值，无需单独存盐
  @ApiHideProperty()
  @Exclude()
  @Column({ name: 'password', comment: '密码', select: false })
  password!: string;

  /**
   * 角色
   *
   * 默认 user；管理员由初始化脚本或后台流程显式提升。
   * 角色随访问令牌下发，接口级授权见 `@Roles()` + `RolesGuard`。
   * 变更角色后旧令牌在过期前仍保留旧角色（模板暂未实现令牌吊销）。
   */
  @Column({
    name: 'role',
    type: 'varchar',
    length: 16,
    default: Role.USER,
    comment: '角色: admin-管理员, user-普通用户',
  })
  role!: Role;

  @Column({
    name: 'status',
    type: 'tinyint',
    default: Status.ENABLED,
    comment: '认证状态: 0-禁用, 1-启用',
  })
  status!: Status;

  @Column({ name: 'last_login_at', type: 'datetime', nullable: true, comment: '最后登录时间' })
  lastLoginAt!: Date | null;

  @Column({
    name: 'last_login_ip',
    type: 'varchar',
    length: 45,
    nullable: true,
    comment: '最后登录IP',
  })
  lastLoginIp!: string | null;

  @Column({ name: 'login_attempts', type: 'int', default: 0, comment: '登录失败次数' })
  loginAttempts!: number;

  /**
   * 令牌版本
   *
   * 签发令牌时写入 `ver` 声明；改密 / 禁用 / 改角色时 +1，
   * 旧令牌在下一次校验（受 `NEST_AUTH_TOKEN_CACHE_TTL` 缓存影响）即失效。
   */
  @Column({ name: 'token_version', type: 'int', default: 0, comment: '令牌版本(用于吊销)' })
  tokenVersion!: number;

  @Column({ name: 'locked_at', type: 'datetime', nullable: true, comment: '账户锁定时间' })
  lockedAt!: Date | null;

  @Column({
    name: 'password_changed_at',
    type: 'datetime',
    nullable: true,
    comment: '密码最后修改时间',
  })
  passwordChangedAt!: Date | null;

  // 一对一关联用户信息（反向侧，不持有外键；级联规则由 User 侧持有外键处声明）
  //
  // 与 User 实体之间存在双向引用：这里同样使用「字符串目标 + type-only 导入」，
  // 避免 emitDecoratorMetadata 在装饰器求值阶段生成对 User 的强引用，
  // 从而消除两个实体模块之间的运行期循环依赖（深层单文件导入时不再 TDZ）。
  @ApiHideProperty()
  @OneToOne('User', 'auth')
  user!: User;
}
