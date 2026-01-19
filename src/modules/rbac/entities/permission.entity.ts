import { BaseEntity } from '@/database/database.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Role } from './role.entity';

/**
 * 权限实体
 *
 * 描述系统中可授权的单个权限点，如 `user:create`。
 */
@Entity('permissions', { comment: '权限信息表' })
export class Permission extends BaseEntity {
  @ApiProperty({ description: '权限ID' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: '权限标识符', example: 'user:create' })
  @Column({ unique: true, comment: '权限标识符，格式: resource:action' })
  name: string; // e.g., 'user:create', 'order:read'

  @ApiProperty({ description: '权限描述', required: false })
  @Column({ nullable: true })
  description: string;

  @ApiProperty({ description: '资源分组', example: '用户管理' })
  @Column({ comment: '资源分类' })
  group: string; // e.g., 'User Management'

  @ManyToMany(() => Role, (role) => role.permissions)
  roles: Role[];
}
