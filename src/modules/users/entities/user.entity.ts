import { Gender, Role, Status } from '../../../common/enums/index.js';
import { BaseEntity } from '../../../database/index.js';
import type { Auth } from '../../auth/entities/auth.entity.js';
import { ApiHideProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 用户信息实体
 *
 * 专门负责存储用户的个人资料信息，与认证信息分离，实现职责单一。
 * 通过一对一关系关联认证实体，形成完整的用户体系。
 */
@Entity('users', { comment: '用户信息表' })
export class User extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { comment: '用户ID' })
  id!: string;

  @Column({
    name: 'nickname',
    type: 'varchar',
    length: 64,
    nullable: true,
    default: '用户',
    comment: '昵称',
  })
  nickname!: string | null;

  @Column({ name: 'avatar', type: 'varchar', length: 255, nullable: true, comment: '头像URL' })
  avatar!: string | null;

  @Column({
    name: 'gender',
    type: 'tinyint',
    default: Gender.UNKNOWN,
    nullable: true,
    comment: '性别: 0-男, 1-女, 2-未知',
  })
  gender!: Gender | null;

  @Column({
    name: 'mobile',
    type: 'char',
    length: 11,
    nullable: true,
    unique: true,
    comment: '手机号（唯一）',
  })
  mobile!: string | null;

  @Column({ name: 'bio', type: 'text', nullable: true, comment: '个人简介' })
  bio!: string | null;

  @Column({
    name: 'email',
    type: 'varchar',
    length: 128,
    nullable: true,
    unique: true,
    comment: '邮箱地址（唯一）',
  })
  email!: string | null;

  @Column({ name: 'birthday', type: 'date', nullable: true, comment: '生日' })
  birthday!: Date | null;

  @Column({ name: 'city', type: 'varchar', length: 100, nullable: true, comment: '所在城市' })
  city!: string | null;

  @Column({ name: 'profession', type: 'varchar', length: 100, nullable: true, comment: '职业' })
  profession!: string | null;

  // 一对一关联认证信息
  // 与 Auth 实体存在双向循环引用：此处使用字符串目标，
  // 避免 ESM 实时绑定在装饰器元数据求值阶段触发 TDZ 错误。
  // 外键 auth_id 由本表持有，ON DELETE CASCADE 必须声明在这一侧才会生效：
  // 删除认证记录时由数据库自动删除对应用户记录。
  //
  // 安全说明：@Exclude 保证该关联不会被序列化进响应。Auth 实体上只排除了
  // password，其余字段（lastLoginIp / loginAttempts / lockedAt 等）属于
  // 认证内部状态，不应随用户资料接口下发。业务代码仍可直接读取 user.auth。
  @ApiHideProperty()
  @Exclude()
  @OneToOne('Auth', 'user', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'auth_id' })
  auth!: Auth;

  /**
   * 账号状态（只读投影）
   *
   * 状态实际存放在关联的认证表上；这里以 getter 形式暴露单个字段，
   * 用于替代历史上「整个 auth 对象被序列化」的做法，保证列表接口仍能拿到状态。
   */
  @Expose()
  @ApiPropertyOptional({ description: '账号状态（来自关联认证记录）', enum: Status, type: Number })
  get status(): Status | undefined {
    return this.auth?.status;
  }

  /**
   * 登录名（只读投影）
   *
   * 认证表不再整体下发，但列表/详情仍需要一个可展示的账号标识，
   * 因此只暴露 username 一个字段。
   */
  @Expose()
  @ApiPropertyOptional({
    description: '登录名（来自关联认证记录）',
    type: String,
    example: 'admin',
  })
  get username(): string | undefined {
    return this.auth?.username;
  }

  /**
   * 角色（只读投影）
   *
   * 供前端做菜单/按钮级可见性控制；接口权限仍由后端 `@Roles()` 独立校验，
   * 前端过滤只影响展示，不能替代服务端鉴权。
   */
  @Expose()
  @ApiPropertyOptional({
    description: '角色（来自关联认证记录）',
    enum: Role,
    type: String,
    example: Role.USER,
  })
  get role(): Role | undefined {
    return this.auth?.role;
  }
}
