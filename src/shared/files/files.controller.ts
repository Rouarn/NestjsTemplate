import { Public } from '@/common/decorators';
import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FileUploadResponseDto } from './dto';
import { FileValidationPipe, FilesValidationPipe } from './pipes/file-validation.pipe';
import { FilesService } from './services/files.service';

@ApiTags('文件上传')
@Controller('upload')
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
  async uploadFile(
    @UploadedFile(FileValidationPipe) file: Express.Multer.File,
  ): Promise<FileUploadResponseDto> {
    if (!file) {
      throw new BadRequestException('文件不能为空');
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
    @UploadedFiles(FilesValidationPipe) files: Express.Multer.File[],
  ): Promise<FileUploadResponseDto[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('文件不能为空');
    }
    return await this.filesService.uploadMultipleFiles(files);
  }
}
