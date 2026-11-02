import { GetCurrentUser, Roles } from '../../common/decorators/index.js';
import { Role } from '../../common/enums/index.js';
import { BusinessException } from '../../common/exceptions/index.js';
import { SelfOrAdminGuard } from '../../common/guards/index.js';
import type { CurrentUser, PaginatedData } from '../../common/interfaces/index.js';
import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BatchDeleteUserDto } from './dto/batch-delete-user.dto.js';
import { QueryUserDto } from './dto/query-user.dto.js';
import { ToggleUserStatusDto } from './dto/toggle-user-status.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UserListResponseDto } from './dto/users.responses.dto.js';
import { User } from './entities/user.entity.js';
import { UsersService } from './users.service.js';

/**
 * 用户控制器（UsersController）
 *
 * 提供用户管理的REST API接口，专注于用户资料的CRUD操作。
 * 与认证功能分离，职责单一明确。
 *
 * 权限约定（全局 JwtAuthGuard + RolesGuard 生效）：
 * - 列表、状态切换、删除、批量删除：仅管理员（`@Roles(Role.ADMIN)`）
 * - 详情、更新：管理员可操作任意用户，普通用户仅限本人（`SelfOrAdminGuard`）
 */
@ApiTags('用户管理')
@UseInterceptors(ClassSerializerInterceptor)
@Controller('users')
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * 获取用户列表
   * 支持分页、筛选和搜索
   */
  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '获取用户列表', description: '分页获取用户列表，支持筛选（仅管理员）' })
  @ApiQuery({ name: 'current', required: false, description: '当前页码', example: 1 })
  @ApiQuery({ name: 'size', required: false, description: '每页数量', example: 10 })
  @ApiQuery({ name: 'nickname', required: false, description: '昵称模糊搜索' })
  @ApiQuery({ name: 'email', required: false, description: '邮箱模糊搜索' })
  @ApiQuery({ name: 'status', required: false, description: '状态筛选' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '获取用户列表成功',
    type: UserListResponseDto,
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: '无权限（非管理员）' })
  /**
   * Service 直接返回标准分页结构（records/total/totalPages/current/size），
   * 全局 ResponseInterceptor 只负责套上响应信封，不再做任何分页推断。
   */
  async findAll(@Query() queryDto: QueryUserDto): Promise<PaginatedData<User>> {
    return await this.usersService.findAll(queryDto);
  }

  /**
   * 根据ID获取用户详情
   */
  @Get(':id')
  @UseGuards(SelfOrAdminGuard)
  @ApiOperation({
    summary: '获取用户详情',
    description: '管理员可查询任意用户，普通用户仅可查询本人',
  })
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
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<User> {
    return await this.usersService.findById(id);
  }

  /**
   * 更新用户信息
   * 管理员可更新任意用户，普通用户只能更新自己的信息
   */
  @Patch(':id')
  @UseGuards(SelfOrAdminGuard)
  @ApiOperation({
    summary: '更新用户信息',
    description: '管理员可更新任意用户，普通用户仅可更新本人',
  })
  @ApiParam({ name: 'id', description: '用户ID', example: 'uuid-123' })
  @ApiBody({ type: UpdateUserDto })
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
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return await this.usersService.update(id, updateUserDto);
  }

  /**
   * 切换用户状态
   * 仅管理员可操作
   */
  @Patch(':id/status')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '切换用户状态', description: '切换用户启用/禁用状态（仅管理员）' })
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
    @Param('id', ParseUUIDPipe) id: string,
    @Body() toggleDto: ToggleUserStatusDto,
  ): Promise<User> {
    return await this.usersService.toggleUserStatus(id, toggleDto.status);
  }

  /**
   * 删除用户
   * 仅管理员可操作
   */
  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '删除用户', description: '删除指定用户（仅管理员，且不能删除自己）' })
  @ApiParam({ name: 'id', description: '用户ID', example: 'uuid-123' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '用户删除成功',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '用户不存在',
  })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetCurrentUser() currentUser: CurrentUser,
  ): Promise<{ message: string }> {
    // 防止管理员误删自己：账号删除会级联清理认证记录，无法自行恢复
    if (currentUser?.userId === id) {
      throw BusinessException.badRequest('不能删除当前登录账号');
    }
    return await this.usersService.remove(id);
  }

  /**
   * 批量删除用户
   * 仅管理员可操作
   */
  @Post('batch-delete')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: '批量删除用户', description: '批量删除多个用户（仅管理员）' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '批量删除成功',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '未找到要删除的用户',
  })
  async batchRemove(
    @Body() batchDeleteDto: BatchDeleteUserDto,
  ): Promise<{ deleted: string[]; missing: string[] }> {
    return await this.usersService.batchRemove(batchDeleteDto);
  }
}
