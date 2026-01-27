import { JwtAuthGuard } from '@/common/guards';
import { PermissionsGuard } from '@/modules/rbac/guards';
import { SupportedFormat } from '@/shared/import-export';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { User } from '../../users/entities/user.entity';
import { RequirePermissions } from '../decorators/permissions.decorator';
import { AssignPermissionsDto } from '../dto/assign-permissions.dto';
import { AssignRolesDto } from '../dto/assign-roles.dto';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { Permission } from '../entities/permission.entity';
import { Role } from '../entities/role.entity';
import { RbacService, RoleImportResult } from '../services/rbac.service';

/**
 * RBAC 控制器
 *
 * 提供角色和权限的管理接口，包括：
 * - 角色的创建、查询、更新、删除
 * - 为角色分配权限
 * - 权限的查询
 * - 为用户分配角色
 */
@ApiTags('RBAC 权限管理')
@ApiBearerAuth()
@Controller('rbac')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  @ApiOperation({ summary: '创建角色', description: '创建一个新的系统角色' })
  @ApiResponse({ status: 201, description: '创建成功', type: Role })
  @Post('roles')
  @RequirePermissions('role:create')
  createRole(@Body() createRoleDto: CreateRoleDto): Promise<Role> {
    return this.rbacService.createRole(createRoleDto);
  }

  @ApiOperation({ summary: '导出角色', description: '导出系统中的角色数据' })
  @ApiResponse({ status: 200, description: '导出成功' })
  @Get('roles/export')
  @RequirePermissions('role:read')
  async exportRoles(
    @Query('format') format: SupportedFormat = 'xlsx',
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.rbacService.exportRoles(format);
    res.setHeader('Content-Type', result.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=${encodeURIComponent(result.fileName)}`,
    );
    res.send(result.buffer);
  }

  @ApiOperation({ summary: '导入角色', description: '从文件导入角色数据' })
  @ApiResponse({ status: 200, description: '导入成功' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '角色数据文件 (xlsx, csv, json)',
        },
      },
    },
  })
  @Post('roles/import')
  @UseInterceptors(FileInterceptor('file'))
  @RequirePermissions('role:create', 'role:update')
  async importRoles(@UploadedFile() file: Express.Multer.File): Promise<RoleImportResult> {
    return this.rbacService.importRoles(file);
  }

  @ApiOperation({ summary: '获取所有角色', description: '获取系统中定义的所有角色及其权限' })
  @ApiResponse({ status: 200, description: '获取成功', type: [Role] })
  @Get('roles')
  @RequirePermissions('role:read')
  findAllRoles(): Promise<Role[]> {
    return this.rbacService.findAllRoles();
  }

  @ApiOperation({ summary: '更新角色', description: '更新指定角色的信息' })
  @ApiResponse({ status: 200, description: '更新成功', type: Role })
  @Put('roles/:id')
  @RequirePermissions('role:update')
  updateRole(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto): Promise<Role> {
    return this.rbacService.updateRole(id, updateRoleDto);
  }

  @ApiOperation({ summary: '删除角色', description: '删除指定角色（系统内置角色不可删除）' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @Delete('roles/:id')
  @RequirePermissions('role:delete')
  deleteRole(@Param('id') id: string): Promise<void> {
    return this.rbacService.deleteRole(id);
  }

  @ApiOperation({ summary: '为角色分配权限', description: '设置指定角色拥有的权限列表' })
  @ApiResponse({ status: 201, description: '分配成功', type: Role })
  @Post('roles/:id/permissions')
  @RequirePermissions('role:assign-permissions')
  assignPermissions(@Param('id') id: string, @Body() dto: AssignPermissionsDto): Promise<Role> {
    return this.rbacService.assignPermissions(id, dto.permissionIds);
  }

  @ApiOperation({ summary: '获取所有权限', description: '获取系统所有可用权限列表' })
  @ApiResponse({ status: 200, description: '获取成功', type: [Permission] })
  @Get('permissions')
  @RequirePermissions('permission:read')
  findAllPermissions(): Promise<Permission[]> {
    return this.rbacService.findAllPermissions();
  }

  @ApiOperation({ summary: '为用户分配角色', description: '设置指定用户拥有的角色列表' })
  @ApiResponse({ status: 201, description: '分配成功' })
  @Post('users/:id/roles')
  @RequirePermissions('user:assign_role')
  assignRolesToUser(@Param('id') userId: string, @Body() dto: AssignRolesDto): Promise<User> {
    return this.rbacService.assignRolesToUser(userId, dto.roleIds);
  }
}
