import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { FileType } from '../enums';

export class FileQueryDto {
  @ApiPropertyOptional({ description: '页码', default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  current?: number = 1;

  @ApiPropertyOptional({
    description: '每页数量',
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  size?: number = 10;

  @ApiPropertyOptional({ enum: FileType, description: '文件类型筛选' })
  @IsOptional()
  @IsEnum(FileType)
  type?: FileType;

  @ApiPropertyOptional({ description: '文件名搜索' })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @ApiPropertyOptional({ description: '是否只显示公开文件' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  publicOnly?: boolean;

  @ApiPropertyOptional({
    description: '排序字段',
    enum: ['createTime', 'size', 'filename'],
  })
  @IsOptional()
  @IsString()
  sortBy?: 'createTime' | 'size' | 'filename' = 'createTime';

  @ApiPropertyOptional({ description: '排序方向', enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
