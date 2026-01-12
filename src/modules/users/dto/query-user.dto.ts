import { Status } from '@/common/enums';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString } from 'class-validator';

/**
 * 用户查询DTO
 *
 * 用于用户列表查询和筛选。
 *
 * 字段说明：
 * - current: 当前页码
 * - size: 每页数量
 * - nickname: 昵称模糊搜索
 * - email: 邮箱模糊搜索
 * - roles: 角色筛选
 * - status: 状态筛选
 */
export class QueryUserDto {
  @ApiPropertyOptional({
    description: '当前页码',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => parseInt(String(value), 10))
  current?: number = 1;

  @ApiPropertyOptional({
    description: '每页数量',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => parseInt(String(value), 10))
  size?: number = 10;

  @ApiPropertyOptional({
    description: '昵称模糊搜索',
    example: '张',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  nickname?: string;

  @ApiPropertyOptional({
    description: '邮箱模糊搜索',
    example: 'user@',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  email?: string;

  @ApiPropertyOptional({
    description: '角色筛选',
    example: 'ADMIN',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  roles?: string;

  @ApiPropertyOptional({
    description: '状态筛选',
    enum: Status,
    example: Status.ENABLED,
  })
  @IsOptional()
  @IsEnum(Status, { message: '状态值无效' })
  @Transform(({ value }: { value: unknown }) => parseInt(String(value), 10))
  status?: Status;
}
