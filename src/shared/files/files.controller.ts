import { Public } from '@/common/decorators';
import {
  Controller,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FileUploadResponseDto } from './dto';
import { BusinessExceptionFactory } from '@/common/exceptions';
import { FileUploadGuard } from './guards/file-upload.guard';
import { FilesService } from './services/files.service';

@ApiTags('文件上传')
@Controller('upload')
@UseGuards(FileUploadGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: '单文件上传' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: '文件上传成功',
    type: FileUploadResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '请求参数错误',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File): Promise<FileUploadResponseDto> {
    if (!file) {
      throw BusinessExceptionFactory.invalidParameter('文件不能为空');
    }
    return await this.filesService.uploadSingleFile(file);
  }

  @Public()
  @Post('multiple')
  @ApiOperation({ summary: '多文件上传' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
      required: ['files'],
    },
  })
  @ApiResponse({
    status: 201,
    description: '文件批量上传成功',
    type: [FileUploadResponseDto],
  })
  @ApiResponse({
    status: 400,
    description: '请求参数错误',
  })
  @UseInterceptors(FilesInterceptor('files'))
  async uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<FileUploadResponseDto[]> {
    if (!files || files.length === 0) {
      throw BusinessExceptionFactory.invalidParameter('文件不能为空');
    }
    return await this.filesService.uploadMultipleFiles(files);
  }
}
