import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Length } from 'class-validator';

/**
 * 验证码验证DTO
 *
 * 用于验证用户输入的验证码是否正确。
 * 支持多种验证码类型和场景。
 *
 * 字段说明：
 * - token: 验证码令牌（必填）
 * - code: 用户输入的验证码（必填）
 * - type: 验证码类型（可选）
 *
 * 验证规则：
 * - token: 必填字符串
 * - code: 4-6个字符
 * - type: 可选的验证码类型标识
 *
 * 使用场景：
 * - 用户登录验证
 * - 用户注册验证
 * - 密码重置验证
 * - 敏感操作验证
 */
export class CaptchaVerifyDto {
  @ApiProperty({
    description: '验证码令牌',
    example: 'captcha-token-123',
  })
  @IsString({ message: '验证码令牌必须是字符串' })
  @IsNotEmpty({ message: '验证码令牌不能为空' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  token!: string;

  @ApiProperty({
    description: '用户输入的验证码',
    example: 'ABCD',
    minLength: 4,
    maxLength: 6,
  })
  @IsString({ message: '验证码必须是字符串' })
  @IsNotEmpty({ message: '验证码不能为空' })
  @Length(4, 6, { message: '验证码长度必须在4-6个字符之间' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  code!: string;
}

/**
 * 验证码生成响应DTO
 *
 * 生成验证码后返回的数据结构。
 *
 * 字段说明：
 * - token: 验证码令牌
 * - image: 验证码图片（Base64编码）
 * - accessTokenTtl: 过期时间（秒）
 */
export class CaptchaResponseDto {
  @ApiProperty({
    description: '验证码令牌',
    example: 'captcha-token-456',
  })
  token!: string;

  @ApiProperty({
    description: '验证码图片（Base64编码）',
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
  })
  image!: string;
}

/**
 * 验证码验证响应DTO
 *
 * 验证码验证结果的数据结构。
 *
 * 字段说明：
 * - success: 验证是否成功
 * - message: 验证结果消息
 * - remainingAttempts: 剩余尝试次数（可选）
 */
export class CaptchaVerifyResponseDto {
  @ApiProperty({
    description: '验证结果消息',
    example: '验证码验证成功',
  })
  message!: string;
}
