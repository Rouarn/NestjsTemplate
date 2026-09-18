import { Gender } from '@/common/enums';
import { BaseEntity } from '@/database';
import { Auth } from '@/modules/auth/entities/auth.entity';
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

  @Column({ name: 'nickname', length: 64, nullable: true, default: '用户', comment: '昵称' })
  nickname!: string;

  @Column({ name: 'avatar', length: 255, nullable: true, comment: '头像URL' })
  avatar!: string;

  @Column({
    name: 'gender',
    type: 'tinyint',
    default: Gender.UNKNOWN,
    nullable: true,
    comment: '性别: 0-男, 1-女, 2-未知',
  })
  gender!: Gender;

  @Column({ name: 'mobile', type: 'char', length: 11, nullable: true, comment: '手机号' })
  mobile!: string;

  @Column({ name: 'bio', type: 'text', nullable: true, comment: '个人简介' })
  bio!: string;

  @Column({ name: 'email', length: 128, nullable: true, comment: '邮箱地址' })
  email!: string;

  @Column({ name: 'birthday', type: 'date', nullable: true, comment: '生日' })
  birthday!: Date;

  @Column({ name: 'city', length: 100, nullable: true, comment: '所在城市' })
  city!: string;

  @Column({ name: 'profession', length: 100, nullable: true, comment: '职业' })
  profession!: string;

  // 一对一关联认证信息
  @OneToOne(() => Auth, (auth) => auth.user)
  @JoinColumn({ name: 'auth_id' })
  auth!: Auth;
}
