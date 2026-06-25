import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

/**
 * 批量删除用户DTO
 *
 * 用于批量删除多个用户的操作。
 *
 * 字段说明：
 * - ids: 要删除的用户ID数组
 *
 * 验证规则：
 * - ids: 必填数组，不能为空
 * - 数组中的每个元素必须是有效的UUID
 */
export class BatchDeleteUserDto {
  @ApiProperty({
    description: '要删除的用户ID数组',
    example: ['uuid1', 'uuid2', 'uuid3'],
    type: [String],
  })
  @IsArray({ message: 'ids必须是数组' })
  @ArrayNotEmpty({ message: 'ids数组不能为空' })
  @IsUUID('4', { each: true, message: '每个ID必须是有效的UUID' })
  ids!: string[];
}
