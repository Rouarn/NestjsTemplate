import { Status } from '@/common/enums';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

/**
 * 切换用户状态DTO
 *
 * 用于启用或禁用用户账户。
 * 注意：这个操作实际上是修改关联的认证实体的状态。
 *
 * 字段说明：
 * - status: 目标状态（可选，如果不提供则自动切换）
 *
 * 验证规则：
 * - status: 可选的状态枚举值
 */
export class ToggleUserStatusDto {
  @ApiPropertyOptional({
    description: '目标状态（可选，不提供则自动切换）',
    enum: Status,
    example: Status.ENABLED,
  })
  @IsOptional()
  @IsEnum(Status, { message: '状态值无效' })
  status?: Status;
}
