import { Gender } from '@/common/enums';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

/**
 * 注册DTO
 *
 * 用于用户注册的数据传输对象。
 * 包含认证信息和基本用户资料信息。
 *
 * 字段说明：
 * - username: 用户名（必填）
 * - password: 密码（必填）
 * - captchaToken: 验证码令牌（必填）
 * - captchaCode: 验证码（必填）
 * - nickname: 昵称（可选）
 * - avatar: 头像（可选）
 * - gender: 性别（可选）
 * - mobile: 手机号（可选）
 * - email: 邮箱（可选）
 *
 * 验证规则：
 * - username: 3-20个字符，只能包含字母、数字和下划线
 * - password: 6-50个字符
 * - captchaCode: 4-6个字符
 * - nickname: 2-20个字符
 * - mobile: 11位数字手机号格式
 * - email: 标准邮箱格式
 *
 * 安全特性：
 * - 必须验证码验证
 * - 密码强度验证
 * - 用户名唯一性检查
 */
export class RegisterDto {
  @ApiProperty({
    description: '用户名',
    example: 'newuser',
    minLength: 3,
    maxLength: 20,
    pattern: '^[a-zA-Z0-9_]+$',
  })
  @IsString({ message: '用户名必须是字符串' })
  @IsNotEmpty({ message: '用户名不能为空' })
  @Length(3, 20, { message: '用户名长度必须在3-20个字符之间' })
  @Matches(/^[a-zA-Z0-9_]+$/, { message: '用户名只能包含字母、数字和下划线' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  username!: string;

  @ApiProperty({
    description: '密码',
    example: 'password123',
    minLength: 6,
    maxLength: 50,
  })
  @IsString({ message: '密码必须是字符串' })
  @IsNotEmpty({ message: '密码不能为空' })
  @Length(6, 50, { message: '密码长度必须在6-50个字符之间' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  password!: string;

  @ApiProperty({
    description: '验证码令牌',
    example: 'captcha-token-789',
  })
  @IsString({ message: '验证码令牌必须是字符串' })
  @IsNotEmpty({ message: '验证码令牌不能为空' })
  captchaToken!: string;

  @ApiProperty({
    description: '验证码',
    example: 'ABCD',
    minLength: 4,
    maxLength: 6,
  })
  @IsString({ message: '验证码必须是字符串' })
  @IsNotEmpty({ message: '验证码不能为空' })
  @Length(4, 6, { message: '验证码长度必须在4-6个字符之间' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  captchaCode!: string;

  @ApiPropertyOptional({
    description: '用户昵称',
    example: '新用户',
    minLength: 2,
    maxLength: 20,
  })
  @IsOptional()
  @IsString({ message: '昵称必须是字符串' })
  @Length(2, 20, { message: '昵称长度必须在2-20个字符之间' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  nickname?: string;

  @ApiPropertyOptional({
    description: '用户头像URL',
    example: 'https://example.com/avatar.jpg',
  })
  @IsOptional()
  @IsString({ message: '头像必须是字符串' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  avatar?: string;

  @ApiPropertyOptional({
    description: '用户性别',
    enum: Gender,
    default: Gender.UNKNOWN,
    example: Gender.UNKNOWN,
  })
  @IsOptional()
  @IsEnum(Gender, { message: '性别值无效' })
  gender?: Gender;

  @ApiPropertyOptional({
    description: '手机号码',
    example: '13800138000',
    pattern: '^1[3-9]\\d{9}$',
  })
  @IsOptional()
  @IsString({ message: '手机号必须是字符串' })
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  mobile?: string;

  @ApiPropertyOptional({
    description: '邮箱地址',
    example: 'newuser@example.com',
    format: 'email',
  })
  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  email?: string;
}

/**
 * 注册响应DTO
 *
 * 注册成功后返回的数据结构。
 *
 * 字段说明：
 * - message: 成功消息
 * - userId: 新创建的用户ID
 * - username: 用户名
 * - nickname: 昵称
 * - avatar: 头像
 * - email: 邮箱
 * - gender: 性别
 * - mobile: 手机号
 */
export class RegisterResponseDto {
  @ApiProperty({
    description: '新创建的用户ID',
    example: 'user-uuid-123',
  })
  userId!: string;

  @ApiProperty({
    description: '用户名',
    example: 'newuser',
  })
  username!: string;

  @ApiProperty({
    description: '昵称',
    example: 'New User',
  })
  nickname!: string;

  @ApiPropertyOptional({
    description: '头像',
    example: 'https://example.com/avatar.jpg',
  })
  avatar?: string;

  @ApiPropertyOptional({
    description: '邮箱',
    example: 'user@example.com',
  })
  email?: string;

  @ApiPropertyOptional({
    description: '性别',
    example: 'MALE',
    enum: ['MALE', 'FEMALE', 'OTHER'],
  })
  gender?: string;

  @ApiPropertyOptional({
    description: '手机号',
    example: '13800138000',
  })
  mobile?: string;
}

/**
 * 创建用户响应DTO
 */
export class AuthCreateUserResponse {
  @ApiProperty({ description: '结果消息', example: '用户创建成功' })
  message!: string;

  @ApiPropertyOptional({ description: '用户记录', type: RegisterResponseDto })
  data?: RegisterResponseDto;
}
