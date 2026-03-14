import { ApiProperty } from '@nestjs/swagger';

export class FileUploadResponseDto {
  @ApiProperty({
    description: '文件访问URL',
    example: '/static/2024/03/uuid.jpg',
  })
  url: string;

  @ApiProperty({
    description: '完整文件访问URL',
    example: 'https://example.com/static/2024/03/uuid.jpg',
  })
  completeUrl: string;
}
