import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { FileUploadResponseDto } from '../dto';
import { StorageService } from './storage.service';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(private readonly storageService: StorageService) {}

  /**
   * 上传单文件
   * @param file 内存中的文件对象
   * @returns 包含访问URL的对象
   */
  async uploadSingleFile(file: Express.Multer.File): Promise<FileUploadResponseDto> {
    // 1. 生成随机文件名 (UUID + 原扩展名)
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${uuidv4()}${ext}`;

    // 2. 生成日期子目录 (YYYY/MM)
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const datePath = path.join(year, month);

    // 3. 构建相对存储路径
    const relativePath = path.join(datePath, filename);

    // 4. 调用存储服务保存文件
    const storedPath = await this.storageService.upload(file, relativePath);

    // 5. 获取访问 URL
    const [url, completeUrl] = this.storageService.getUrl(storedPath);

    this.logger.log(`📁 文件上传成功: ${file.originalname} -> ${completeUrl}`);

    return { url, completeUrl };
  }

  /**
   * 批量上传文件
   * @param files 内存中的文件对象数组
   * @returns 包含访问URL的对象数组
   */
  async uploadMultipleFiles(files: Express.Multer.File[]): Promise<FileUploadResponseDto[]> {
    return Promise.all(files.map((file) => this.uploadSingleFile(file)));
  }
}
