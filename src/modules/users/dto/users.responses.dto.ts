import { ApiProperty } from '@nestjs/swagger';
import { User } from '../entities/user.entity.js';

/**
 * 用户分页响应 DTO
 *
 * 注意：controller 中 service 返回的是 { list, total } 中间形态，
 * 全局 ResponseInterceptor 会转换为下方结构（PaginatedData）后返回给前端，
 * 此 DTO 与拦截器实际输出对齐，而非 service 中间形态
 */
export class UserListResponseDto {
  @ApiProperty({ description: '分页数据列表', type: [User] })
  records!: User[];

  @ApiProperty({ description: '总记录数', example: 100 })
  total!: number;

  @ApiProperty({ description: '总页数', example: 10 })
  totalPages!: number;

  @ApiProperty({ description: '当前页码', example: 1 })
  current!: number;

  @ApiProperty({ description: '每页数量', example: 10 })
  size!: number;
}
