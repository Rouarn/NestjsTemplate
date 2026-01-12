import { BaseEntity } from '@/database';
import { User } from '@/modules/users/entities/user.entity';
import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  Tree,
  TreeChildren,
  TreeParent,
} from 'typeorm';
import { Permission } from './permission.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('roles', { comment: '角色信息表' })
@Tree('closure-table')
export class Role extends BaseEntity {
  @ApiProperty({ description: '角色ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: '角色唯一标识', example: 'admin' })
  @Column({ unique: true, comment: '角色唯一标识，如: admin' })
  name: string;

  @ApiProperty({ description: '角色显示名称', example: '管理员' })
  @Column({ comment: '显示名称，如: 管理员' })
  alias: string;

  @ApiProperty({ description: '角色描述', required: false })
  @Column({ nullable: true, comment: '描述' })
  description: string;

  @ApiProperty({ description: '是否为系统内置角色', example: false })
  @Column({ default: false, comment: '是否为系统内置角色，不可删除', name: 'is_system' })
  isSystem: boolean;

  @ApiProperty({ description: '租户ID', required: false })
  @Column({ name: 'tenant_id', nullable: true, comment: '租户ID' })
  tenantId: string;

  // 角色继承设计
  @ApiProperty({ description: '子角色列表', type: () => [Role], required: false })
  @TreeChildren()
  children: Role[];

  @ApiProperty({ description: '父级角色', type: () => Role, required: false })
  @TreeParent()
  parent: Role;

  @ApiProperty({ description: '权限列表', type: () => [Permission], required: false })
  @ManyToMany(() => Permission, (permission) => permission.roles)
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions: Permission[];

  @ApiProperty({ description: '用户列表', type: () => [User], required: false })
  @ManyToMany(() => User, (user) => user.roles)
  users: User[];
}
