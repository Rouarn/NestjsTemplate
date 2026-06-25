import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

/**
 * 为角色分配权限的请求数据
 */
export class AssignPermissionsDto {
  @ApiProperty({ description: '权限ID列表', type: [String], example: ['uuid-1', 'uuid-2'] })
  @IsArray()
  // @ArrayNotEmpty({ message: '权限ID列表不能为空' })
  @IsUUID('all', { each: true, message: '每个权限ID必须是UUID格式' })
  permissionIds!: string[];
}
