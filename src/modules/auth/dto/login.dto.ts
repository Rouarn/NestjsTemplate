import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Length } from 'class-validator';

/**
 * 登录DTO
 *
 * 用于用户登录认证的数据传输对象。
 * 专注于认证相关字段，不包含用户资料信息。
 *
 * 字段说明：
 * - username: 用户名（必填）
 * - password: 密码（必填）
 * - captchaToken: 验证码令牌（可选）
 * - captchaCode: 验证码（可选）
 *
 * 验证规则：
 * - username: 3-20个字符
 * - password: 6-50个字符
 * - captchaCode: 4-6个字符（如果提供）
 *
 * 安全特性：
 * - 密码字段不会在响应中返回
 * - 支持验证码验证
 */
export class LoginDto {
  @ApiProperty({
    description: '用户名',
    example: 'superadmin',
    minLength: 3,
    maxLength: 20,
  })
  @IsString({ message: '用户名必须是字符串' })
  @IsNotEmpty({ message: '用户名不能为空' })
  @Length(3, 20, { message: '用户名长度必须在3-20个字符之间' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  username!: string;

  @ApiProperty({
    description: '密码',
    example: '123456',
    minLength: 6,
    maxLength: 50,
  })
  @IsString({ message: '密码必须是字符串' })
  @IsNotEmpty({ message: '密码不能为空' })
  @Length(6, 50, { message: '密码长度必须在6-50个字符之间' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  password!: string;
}
