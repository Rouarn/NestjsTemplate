import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Length } from 'class-validator';

/**
 * 修改密码DTO
 *
 * 用于用户修改密码的数据传输对象。
 *
 * 字段说明：
 * - oldPassword: 旧密码（必填）
 * - newPassword: 新密码（必填）
 * - confirmPassword: 确认新密码（必填）
 *
 * 验证规则：
 * - 所有密码字段都必须是6-50个字符
 * - 新密码不能与旧密码相同
 * - 新密码与确认密码必须一致
 */
export class ChangePasswordDto {
  @ApiProperty({
    description: '旧密码',
    example: 'oldpassword123',
    minLength: 6,
    maxLength: 50,
  })
  @IsString({ message: '旧密码必须是字符串' })
  @IsNotEmpty({ message: '旧密码不能为空' })
  @Length(6, 50, { message: '旧密码长度必须在6-50个字符之间' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  oldPassword!: string;

  @ApiProperty({
    description: '新密码',
    example: 'newpassword123',
    minLength: 6,
    maxLength: 50,
  })
  @IsString({ message: '新密码必须是字符串' })
  @IsNotEmpty({ message: '新密码不能为空' })
  @Length(6, 50, { message: '新密码长度必须在6-50个字符之间' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  newPassword!: string;

  @ApiProperty({
    description: '确认新密码',
    example: 'newpassword123',
    minLength: 6,
    maxLength: 50,
  })
  @IsString({ message: '确认密码必须是字符串' })
  @IsNotEmpty({ message: '确认密码不能为空' })
  @Length(6, 50, { message: '确认密码长度必须在6-50个字符之间' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  confirmPassword!: string;
}
