import { PartialType } from '@nestjs/swagger'; // Assuming swagger is used, or mapped-types
import { CreateRoleDto } from './create-role.dto';

export class UpdateRoleDto extends PartialType(CreateRoleDto) {}
