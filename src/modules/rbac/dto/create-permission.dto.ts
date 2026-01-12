import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class CreatePermissionDto {
  @ApiProperty({ description: '权限标识符', example: 'user:create', minLength: 3, maxLength: 100 })
  @IsString()
  @Length(3, 100)
  name: string; // e.g. user:create

  @ApiProperty({ description: '权限描述', required: false, example: '允许创建用户' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '权限分组', required: false, example: '用户管理' })
  @IsString()
  @IsOptional()
  group?: string;
}
