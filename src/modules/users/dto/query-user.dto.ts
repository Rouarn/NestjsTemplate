import { Status } from '@/common/enums';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * query 参数均为字符串，严格转数字：
 * 合法数字字符串（含首尾空格）转 number；`abc`、`10abc` 等返回 NaN，
 * 再由 @IsInt 拦截为 400，避免 NaN 流入分页计算（parseInt 会宽松放行 `10abc`）。
 */
const toNumber = ({ value }: { value: unknown }): unknown => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') return Number(value);
  return value;
};

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
 * - status: 状态筛选
 *
 * 注意：管道已关闭隐式类型转换，current / size / status 均在此显式转换。
 */
export class QueryUserDto {
  @ApiPropertyOptional({
    description: '当前页码',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Transform(toNumber)
  @IsInt({ message: '当前页码必须是整数' })
  @Min(1, { message: '当前页码不能小于1' })
  current?: number = 1;

  @ApiPropertyOptional({
    description: '每页数量',
    example: 10,
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Transform(toNumber)
  @IsInt({ message: '每页数量必须是整数' })
  @Min(1, { message: '每页数量不能小于1' })
  @Max(100, { message: '每页数量不能超过100' })
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
    description: '状态筛选',
    enum: Status,
    example: Status.ENABLED,
  })
  @IsOptional()
  @Transform(toNumber)
  @IsEnum(Status, { message: '状态值无效' })
  status?: Status;
}
