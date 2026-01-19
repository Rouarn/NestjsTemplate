import { PartialType } from '@nestjs/swagger';
import { CreateRoleDto } from './create-role.dto';

/**
 * 更新角色的请求数据
 *
 * 基于 CreateRoleDto 的可选字段扩展。
 */
export class UpdateRoleDto extends PartialType(CreateRoleDto) {}
