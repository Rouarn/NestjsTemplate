import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

/**
 * 创建角色的请求数据
 */
export class CreateRoleDto {
  @ApiProperty({ description: '角色唯一标识', example: 'admin', minLength: 2, maxLength: 50 })
  @IsString()
  @Length(2, 50)
  name: string;

  @ApiProperty({ description: '角色显示名称', example: '管理员', minLength: 2, maxLength: 50 })
  @IsString()
  @Length(2, 50)
  alias: string;

  @ApiProperty({ description: '角色描述', required: false, example: '系统管理员，拥有所有权限' })
  @IsString()
  @IsOptional()
  description?: string;
}
