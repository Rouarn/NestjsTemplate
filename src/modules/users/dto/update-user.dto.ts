import { Gender } from '../../../common/enums/index.js';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
/**
 * 更新用户DTO
 *
 * 继承自CreateUserDto，所有字段都是可选的。
 * 用于更新用户资料信息，不包含认证相关字段。
 *
 * 特点：
 * - 所有字段可选，支持部分更新
 * - 排除authId字段（不允许更改关联关系）
 * - 保持与创建DTO相同的验证规则
 */
export class UpdateUserDto {
  @ApiPropertyOptional({
    description: '用户昵称',
    example: '李四',
    minLength: 2,
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @Length(2, 20, { message: '昵称长度必须在2-20个字符之间' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  nickname?: string;

  @ApiPropertyOptional({
    description: '用户头像URL',
    example: 'https://example.com/new-avatar.jpg',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  avatar?: string;

  @ApiPropertyOptional({
    description: '用户性别',
    enum: Gender,
    example: Gender.FEMALE,
  })
  @IsOptional()
  @IsEnum(Gender, { message: '性别值无效' })
  gender?: Gender;

  @ApiPropertyOptional({
    description: '手机号码',
    example: '13900139000',
    pattern: '^1[3-9]\\d{9}$',
  })
  @IsOptional()
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  mobile?: string;

  @ApiPropertyOptional({
    description: '邮箱地址',
    example: 'newemail@example.com',
    format: 'email',
  })
  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  email?: string;

  @ApiPropertyOptional({
    description: '个人简介',
    example: '更新后的个人介绍',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @Length(0, 200, { message: '个人简介不能超过200个字符' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  bio?: string;

  @ApiPropertyOptional({
    description: '生日',
    example: '1992-05-15',
    format: 'date',
  })
  @IsOptional()
  @Transform(({ value }: { value: string }) => (value === '' ? null : value))
  @IsDateString({}, { message: '生日格式不正确' })
  birthday?: string;

  @ApiPropertyOptional({
    description: '所在城市',
    example: '上海市',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @Length(0, 50, { message: '城市名称不能超过50个字符' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  city?: string;

  @ApiPropertyOptional({
    description: '职业',
    example: '软件工程师',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @Length(0, 50, { message: '职业名称不能超过50个字符' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  profession?: string;
}
