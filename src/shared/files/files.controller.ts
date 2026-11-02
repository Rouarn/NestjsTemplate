import { GetCurrentUser } from '../../common/decorators/index.js';
import { BusinessException } from '../../common/exceptions/index.js';
import {
  Controller,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ApiFile, ApiFiles, UploadQuota } from './decorators/index.js';
import { FileUploadResponseDto } from './dto/index.js';
import { FileUploadGuard } from './guards/file-upload.guard.js';
import { FilesService } from './services/files.service.js';

@ApiTags('文件上传')
@ApiBearerAuth()
@Controller('upload')
@UseGuards(FileUploadGuard)
@Throttle({ default: { limit: 10, ttl: 60_000 } }) // 上传接口限流：每 IP 每分钟 10 次
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post()
  @UploadQuota(1)
  @ApiOperation({ summary: '单文件上传' })
  @ApiFile()
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
    @UploadedFile() file: Express.Multer.File,
    @GetCurrentUser('userId') userId: string,
  ): Promise<FileUploadResponseDto> {
    if (!file) {
      throw BusinessException.badRequest('文件不能为空');
    }
    return await this.filesService.uploadSingleFile(file, userId);
  }

  @Post('multiple')
  @UploadQuota('max')
  @ApiOperation({ summary: '多文件上传' })
  @ApiFiles()
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
    @GetCurrentUser('userId') userId: string,
  ): Promise<FileUploadResponseDto[]> {
    if (!files || files.length === 0) {
      throw BusinessException.badRequest('文件不能为空');
    }
    return await this.filesService.uploadMultipleFiles(files, userId);
  }
}
