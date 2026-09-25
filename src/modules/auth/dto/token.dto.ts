import { JWT_CONSTANTS } from '#/common/constants/index.js';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * 刷新令牌DTO
 *
 * 用于刷新访问令牌的数据传输对象。
 *
 * 字段说明：
 * - refreshToken: 刷新令牌（必填）
 *
 * 验证规则：
 * - refreshToken: 必填字符串
 */
export class RefreshTokenDto {
  @ApiProperty({
    description: '刷新令牌',
    example: 'refresh-token-789',
  })
  @IsString({ message: '刷新令牌必须是字符串' })
  @IsNotEmpty({ message: '刷新令牌不能为空' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  refreshToken!: string;
}

/**
 * 令牌响应DTO
 *
 * 令牌生成或刷新后返回的数据结构。
 *
 * 字段说明：
 * - accessToken: 访问令牌
 * - refreshToken: 刷新令牌（可选）
 * - tokenType: 令牌类型
 * - accessTokenTtl: 访问令牌过期时间（秒）
 * - refreshTokenTtl: 刷新令牌过期时间（秒，可选）
 */
export class TokenResponseDto {
  @ApiProperty({
    description: '访问令牌',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken!: string;

  @ApiPropertyOptional({
    description: '刷新令牌',
    example: 'refresh-token-abc',
  })
  refreshToken?: string;

  @ApiProperty({
    description: '令牌类型',
    example: JWT_CONSTANTS.TOKEN_PREFIX,
    default: JWT_CONSTANTS.TOKEN_PREFIX,
  })
  tokenType: string = JWT_CONSTANTS.TOKEN_PREFIX;

  @ApiProperty({
    description: '访问令牌过期时间（秒）',
    example: 3600,
  })
  accessTokenTtl!: number;

  @ApiPropertyOptional({
    description: '刷新令牌过期时间（秒）',
    example: 604800,
  })
  refreshTokenTtl?: number;
}
