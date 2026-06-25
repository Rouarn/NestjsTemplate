import { Status } from '@/common/enums';
import { BaseEntity } from '@/database';
import { User } from '@/modules/users/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, JoinTable, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Permission } from './permission.entity';

/**
 * 角色实体
 *
 * 用于将一组权限绑定成可分配的角色，例如管理员、普通用户等。
 */
@Entity('roles', { comment: '角色信息表' })
export class Role extends BaseEntity {
  @ApiProperty({ description: '角色ID' })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({ description: '角色唯一标识', example: 'admin' })
  @Column({ unique: true, comment: '角色唯一标识，如: admin' })
  name!: string;

  @ApiProperty({ description: '角色显示名称', example: '管理员' })
  @Column({ comment: '显示名称，如: 管理员' })
  alias!: string;

  @ApiProperty({ description: '角色描述', required: false })
  @Column({ nullable: true, comment: '描述' })
  description!: string;

  @ApiProperty({ description: '是否为系统内置角色', example: Status.DISABLED })
  @Column({
    type: 'tinyint',
    name: 'is_system',
    default: Status.DISABLED,
    comment: '是否为系统内置角色，不可删除',
  })
  isSystem!: Status;

  @ApiProperty({ description: '权限列表', type: () => [Permission], required: false })
  @ManyToMany(() => Permission, (permission) => permission.roles)
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions!: Permission[];

  @ApiProperty({ description: '用户列表', type: () => [User], required: false })
  @ManyToMany(() => User, (user) => user.roles)
  users!: User[];
}
