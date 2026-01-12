import { Roles } from '@/common/decorators';
import { Role } from '@/common/enums';
import { RolesGuard } from '@/common/guards';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BatchDeleteUserDto } from './dto/batch-delete-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { ToggleUserStatusDto } from './dto/toggle-user-status.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserListResponseDto } from './dto/users.responses.dto';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

/**
 * 用户控制器（UsersController）
 *
 * 提供用户管理的REST API接口，专注于用户资料的CRUD操作。
 * 与认证功能分离，职责单一明确。
 */
@ApiTags('用户管理')
@Controller('users')
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * 获取用户列表
   * 支持分页、筛选和搜索
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.SYSTEM_ADMIN, Role.ORG_ADMIN)
  @ApiOperation({ summary: '获取用户列表', description: '分页获取用户列表，支持筛选' })
  @ApiQuery({ name: 'current', required: false, description: '当前页码', example: 1 })
  @ApiQuery({ name: 'size', required: false, description: '每页数量', example: 10 })
  @ApiQuery({ name: 'nickname', required: false, description: '昵称模糊搜索' })
  @ApiQuery({ name: 'email', required: false, description: '邮箱模糊搜索' })
  @ApiQuery({ name: 'roles', required: false, description: '角色筛选' })
  @ApiQuery({ name: 'status', required: false, description: '状态筛选' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '获取用户列表成功',
    type: UserListResponseDto,
  })
  async findAll(@Query() queryDto: QueryUserDto): Promise<UserListResponseDto> {
    const { current, size } = queryDto;
    return await this.usersService.findAll(current, size);
  }

  /**
   * 根据ID获取用户详情
   */
  @Get(':id')
  @ApiOperation({ summary: '获取用户详情', description: '根据用户ID获取详细信息' })
  @ApiParam({ name: 'id', description: '用户ID', example: 'uuid-123' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '获取用户详情成功',
    type: User,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '用户不存在',
  })
  async findOne(@Param('id') id: string): Promise<User> {
    return await this.usersService.findById(id);
  }

  /**
   * 更新用户信息
   * 管理员可更新任意用户，普通用户只能更新自己
   */
  @Patch(':id')
  @ApiOperation({ summary: '更新用户信息', description: '更新用户资料信息' })
  @ApiParam({ name: 'id', description: '用户ID', example: 'uuid-123', type: UpdateUserDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '用户信息更新成功',
    type: User,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '用户不存在',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: '邮箱已被使用',
  })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto): Promise<void> {
    return await this.usersService.update(id, updateUserDto);
  }

  /**
   * 切换用户状态
   * 仅管理员可操作
   */
  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.SYSTEM_ADMIN, Role.ORG_ADMIN)
  @ApiOperation({ summary: '切换用户状态', description: '切换用户启用/禁用状态' })
  @ApiParam({ name: 'id', description: '用户ID', example: 'uuid-123' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '用户状态切换成功',
    type: User,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '用户不存在',
  })
  async toggleStatus(
    @Param('id') id: string,
    @Body() toggleDto: ToggleUserStatusDto,
  ): Promise<User> {
    return await this.usersService.toggleUserStatus(id, toggleDto.status);
  }

  /**
   * 删除用户
   * 仅管理员可操作
   */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.SYSTEM_ADMIN, Role.ORG_ADMIN)
  @ApiOperation({ summary: '删除用户', description: '删除指定用户' })
  @ApiParam({ name: 'id', description: '用户ID', example: 'uuid-123' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '用户删除成功',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '用户不存在',
  })
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    return await this.usersService.remove(id);
  }

  /**
   * 批量删除用户
   * 仅管理员可操作
   */
  @Post('batch-delete')
  @UseGuards(RolesGuard)
  @Roles(Role.SYSTEM_ADMIN, Role.ORG_ADMIN)
  @ApiOperation({ summary: '批量删除用户', description: '批量删除多个用户' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '批量删除成功',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '未找到要删除的用户',
  })
  async batchRemove(@Body() batchDeleteDto: BatchDeleteUserDto): Promise<{ message: string }> {
    return await this.usersService.batchRemove(batchDeleteDto);
  }
}
