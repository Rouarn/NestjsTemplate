import { ApiProperty } from '@nestjs/swagger';
import { User } from '../entities/user.entity';

export class UserListResponseDto {
  @ApiProperty({ description: '用户列表', type: [User] })
  list!: User[];

  @ApiProperty({ description: '总数量', example: 100 })
  total!: number;
}
