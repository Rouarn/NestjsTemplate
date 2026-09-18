import { BusinessException } from '@/common/exceptions';
import { AppConfigService } from '@/config';
import { Inject, Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { FileUploadResponseDto } from '../dto';
import { STORAGE_ADAPTER, StorageAdapter } from '../interfaces';

/**
 * file-type@22 是 ESM-only 包，类型仅通过 package.json 的 exports 暴露，
 * 在本项目 CommonJS + node10 模块解析下无法通过 import 引用其类型。
 * Node 自 22.12 起支持 require(ESM)，本项目 engines 要求 Node >= 22.18，
 * 因此这里用 require 加载，并声明实际使用到的最小类型面。
 */
interface DetectedFileType {
  ext: string;
  mime: string;
}

const { fileTypeFromFile } = require('file-type') as {
  fileTypeFromFile: (filePath: string) => Promise<DetectedFileType | undefined>;
};

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    @Inject(STORAGE_ADAPTER) private readonly storage: StorageAdapter,
    private readonly appConfigService: AppConfigService,
  ) {}

  /**
   * 上传单文件
   * @param file Multer 磁盘存储产生的文件对象（文件内容在临时目录中）
   * @returns 包含访问URL的对象
   */
  async uploadSingleFile(file: Express.Multer.File): Promise<FileUploadResponseDto> {
    try {
      // 1. 基于文件内容 (magic number) 检测真实类型
      const detectedType = await this.detectFileType(file);

      // 2. 校验真实类型与声明类型一致、且在允许范围内
      this.assertTypeAllowed(detectedType, file);

      // 3. 生成目标文件名与日期子目录（扩展名取自内容检测结果，不信任原始文件名）
      const filename = `${uuidv4()}.${detectedType.ext}`;
      const relativePath = path.join(this.getDatePath(), filename);

      // 4. 将临时文件移动到存储目录
      const storedPath = await this.storage.upload(file.path, relativePath);

      // 5. 获取访问 URL
      const [url, completeUrl] = this.storage.getUrl(storedPath);

      this.logger.log(`📁 文件上传成功: ${file.originalname} -> ${completeUrl}`);

      return { url, completeUrl };
    } catch (error) {
      // 校验或存储失败时清理磁盘上的临时文件，避免残留
      await this.removeTempFile(file);
      throw error;
    }
  }

  /**
   * 批量上传文件
   * @param files 文件对象数组
   * @returns 包含访问URL的对象数组
   */
  async uploadMultipleFiles(files: Express.Multer.File[]): Promise<FileUploadResponseDto[]> {
    return Promise.all(files.map((file) => this.uploadSingleFile(file)));
  }

  /**
   * 根据文件内容检测真实类型
   */
  private async detectFileType(file: Express.Multer.File): Promise<DetectedFileType> {
    const detected = await fileTypeFromFile(file.path);

    if (!detected) {
      throw BusinessException.badRequest('无法识别文件类型，文件内容可能已损坏或被篡改');
    }

    return detected;
  }

  /**
   * 校验检测出的真实类型：
   * 1. 必须与客户端声明的 mimetype 一致（防止改后缀或伪造请求头）；
   * 2. 必须在配置的允许类型白名单内（白名单为空表示不限制）。
   */
  private assertTypeAllowed(detectedType: DetectedFileType, file: Express.Multer.File): void {
    if (detectedType.mime !== file.mimetype) {
      throw BusinessException.badRequest(
        `文件内容与声明类型不符: 声明 ${file.mimetype}, 实际 ${detectedType.mime}`,
      );
    }

    const { uploadsAllowedTypes } = this.appConfigService.staticAssetsOptions;
    const allowedTypes = uploadsAllowedTypes
      .split(',')
      .map((type) => type.trim())
      .filter(Boolean);

    if (allowedTypes.length > 0 && !allowedTypes.includes(detectedType.mime)) {
      throw BusinessException.badRequest(
        `不支持的文件类型: ${detectedType.mime}。 允许的类型: ${allowedTypes.join(', ')}`,
      );
    }
  }

  /**
   * 生成日期子目录 (YYYY/MM)
   */
  private getDatePath(): string {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');

    return path.join(year, month);
  }

  /**
   * 删除临时文件（文件可能已被移动，失败时忽略）
   */
  private async removeTempFile(file: Express.Multer.File): Promise<void> {
    try {
      await fs.unlink(file.path);
    } catch {
      // ignore
    }
  }
}
