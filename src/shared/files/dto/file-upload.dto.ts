import { Status } from '@/common/enums';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class FileUploadDto {
  @ApiProperty({ description: '文件描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '是否公开', default: Status.DISABLED })
  @IsOptional()
  @IsEnum(Status)
  isPublic?: Status;

  @ApiPropertyOptional({ description: '上传协议', default: 'HTTP' })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  protocol?: string;
}
