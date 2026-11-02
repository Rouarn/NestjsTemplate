import { GetCurrentUser, Public } from '../../common/decorators/index.js';
import type { CurrentUser } from '../../common/interfaces/index.js';
import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Ip,
  Post,
  Put,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { User } from '../users/entities/user.entity.js';
import { AuthService } from './auth.service.js';
import {
  CaptchaResponseDto,
  CaptchaVerifyDto,
  CaptchaVerifyResponseDto,
} from './dto/captcha.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ChangePasswordDto } from './dto/password.dto.js';
import { AuthCreateUserResponse, RegisterDto } from './dto/register.dto.js';
import { RefreshTokenDto, TokenResponseDto } from './dto/token.dto.js';

/**
 * 认证控制器
 *
 * 处理用户认证相关的HTTP请求，包括登录、注册、验证码等功能。
 * 与AuthService配合完成认证业务逻辑。
 */
@ApiTags('认证管理')
@UseInterceptors(ClassSerializerInterceptor)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 获取验证码
   * @returns 验证码图片和对应的token
   */
  @ApiOperation({
    summary: '获取验证码',
    description: '生成验证码图片和对应的token，支持防爬机制和安全增强',
  })
  @ApiResponse({ status: 200, description: '成功获取验证码', type: CaptchaResponseDto })
  // 验证码生成有 CPU 成本（SVG 绘制），单独限流
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Public()
  @Get('captcha')
  async getCaptcha(): Promise<CaptchaResponseDto> {
    return this.authService.generateCaptcha();
  }

  /**
   * 验证验证码
   * @param body 验证码验证请求数据
   * @returns 验证码验证结果
   */
  @ApiOperation({
    summary: '验证验证码',
    description: '验证用户输入的验证码是否正确，包含安全验证机制',
  })
  @ApiBody({
    description: '验证码验证请求',
    type: CaptchaVerifyDto,
  })
  @ApiResponse({ status: 200, description: '验证码验证结果', type: CaptchaVerifyResponseDto })
  @Public()
  @Post('captcha/verify')
  verifyCaptcha(@Body() body: CaptchaVerifyDto): Promise<CaptchaVerifyResponseDto> {
    return this.authService.verifyCaptcha(body);
  }

  /**
   * 用户注册
   * @param body 注册请求数据
   * @returns 注册结果
   */
  @ApiOperation({
    summary: '用户注册',
    description: '新用户注册账号',
  })
  @ApiBody({
    description: '注册请求',
    type: RegisterDto,
  })
  @ApiResponse({ status: 200, description: '注册结果', type: AuthCreateUserResponse })
  @Public()
  @Post('register')
  register(@Body() body: RegisterDto): Promise<AuthCreateUserResponse> {
    return this.authService.register(body);
  }

  /**
   * 用户登录
   * @param body 登录请求数据
   * @param clientIp 客户端IP地址
   * @returns 登录结果和令牌信息
   */
  @ApiOperation({
    summary: '用户登录',
    description: '用户使用用户名和密码进行登录认证',
  })
  @ApiBody({
    description: '登录请求',
    type: LoginDto,
  })
  @ApiResponse({
    status: 201,
    description: '登录成功',
    type: TokenResponseDto,
  })
  // 登录是最需要防爆破的入口：单独收紧到每分钟 5 次（全局兜底为 100 次）
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Public()
  @Post('login')
  login(@Body() body: LoginDto, @Ip() clientIp: string): Promise<TokenResponseDto> {
    return this.authService.login(body, clientIp);
  }

  /**
   * 刷新令牌
   * @param body 刷新令牌请求数据
   * @returns 新的访问令牌和刷新令牌
   */
  @ApiOperation({
    summary: '刷新令牌',
    description: '使用有效的刷新令牌获取新的访问令牌（无状态 JWT，刷新令牌在过期前始终有效）',
  })
  @ApiBody({
    description: '刷新令牌请求',
    type: RefreshTokenDto,
  })
  @ApiResponse({
    status: 200,
    description: '刷新成功',
    type: TokenResponseDto,
  })
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Public()
  @Post('refresh')
  refresh(@Body() body: RefreshTokenDto): Promise<TokenResponseDto> {
    return this.authService.refreshToken(body);
  }

  /**
   * 获取用户信息
   * @param user 当前登录用户信息
   * @returns 用户详细信息
   */
  @ApiOperation({
    summary: '获取用户信息',
    description: '获取当前登录用户的详细信息',
  })
  @ApiResponse({ status: 200, description: '成功获取用户信息', type: User })
  @ApiBearerAuth()
  @Get('getUserInfo')
  async getUserInfo(@GetCurrentUser() user: CurrentUser): Promise<User> {
    return await this.authService.getAuthInfo(user);
  }

  /**
   * 修改密码
   * @param changePasswordDto 修改密码数据
   * @param user 当前用户信息
   * @returns 修改结果
   */
  @Put('change-password')
  @ApiOperation({
    summary: '修改密码',
    description: '允许已登录用户修改自己的密码',
  })
  @ApiResponse({ status: 200, description: '密码修改成功' })
  @ApiResponse({ status: 400, description: '密码修改失败' })
  @ApiResponse({
    status: 401,
    description: '未授权访问',
  })
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @GetCurrentUser() user: { authId: string },
  ): Promise<{ message: string }> {
    return this.authService.changePassword(changePasswordDto, user.authId);
  }

  /**
   * 退出登录
   * @param user 当前登录用户信息
   * @returns 退出登录结果
   */
  @ApiOperation({
    summary: '退出登录',
    description: '退出当前用户的登录状态',
  })
  @ApiResponse({ status: 200, description: '退出登录成功' })
  @ApiResponse({
    status: 401,
    description: '未授权访问',
  })
  @Post('logout')
  logout(): Promise<{ message: string }> {
    return this.authService.logout();
  }
}
