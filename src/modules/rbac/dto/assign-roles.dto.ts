import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ArrayNotEmpty } from 'class-validator';

export class AssignRolesDto {
  @ApiProperty({ description: '角色ID列表', type: [String], example: ['uuid-1', 'uuid-2'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  roleIds: string[];
}
