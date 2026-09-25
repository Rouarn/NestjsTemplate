import { BusinessException } from '#/common/exceptions/index.js';
import { AppConfigService } from '#/config/index.js';
import { Inject, Injectable } from '@nestjs/common';
import { fileTypeFromFile } from 'file-type';
import * as fs from 'fs/promises';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { Logger } from 'winston';
import { FileUploadResponseDto } from '../dto/index.js';
import type { StorageAdapter } from '../interfaces/index.js';
import { STORAGE_ADAPTER } from '../interfaces/index.js';

/**
 * file-type 实际返回类型的最小结构化描述，
 * 仅声明本服务使用到的字段。
 */
interface DetectedFileType {
  ext: string;
  mime: string;
}

@Injectable()
export class FilesService {
  constructor(
    @Inject(STORAGE_ADAPTER) private readonly storage: StorageAdapter,
    private readonly appConfigService: AppConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
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

      this.logUploadSuccess(file, completeUrl);

      return { url, completeUrl };
    } catch (error) {
      // 校验或存储失败时清理磁盘上的临时文件，避免残留
      await this.removeTempFile(file);
      throw error;
    }
  }

  /**
   * 打印文件上传成功日志
   * 风格与 LoggerMiddleware 的「请求入口」、LoggingInterceptor 的「响应出口」保持一致
   * @param file Multer 文件对象（取原始文件名与大小）
   * @param completeUrl 文件完整访问地址
   */
  private logUploadSuccess(file: Express.Multer.File, completeUrl: string): void {
    this.logger.info('┌─ 📁 文件上传成功 ───────────────────────────────────────────────┐');
    this.logger.info(`│ 📄 原文件名: ${this.decodeOriginalName(file.originalname)}`);
    this.logger.info(`│ 📦 文件大小: ${this.formatFileSize(file.size)}`);
    this.logger.info(`│ 🔗 访问地址: ${completeUrl}`);
    this.logger.info('└─────────────────────────────────────────────────────────────────┘');
  }

  /**
   * 还原 Multer 原始文件名的编码
   * Busboy 默认以 latin1 给出 originalname，中文名需按 UTF-8 还原；
   * 若还原后出现替换字符，说明原名并非该编码方式，回退原值避免二次乱码
   * @param name Multer 提供的原始文件名
   * @returns 可安全打印/展示的文件名
   */
  private decodeOriginalName(name: string): string {
    const decoded = Buffer.from(name, 'latin1').toString('utf8');
    return decoded.includes('\uFFFD') ? name : decoded;
  }

  /**
   * 将字节数格式化为人类可读的文件大小
   * @param bytes 文件字节数
   * @returns 如 248.5 KB / 1.2 MB
   */
  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;

    const units = ['KB', 'MB', 'GB'];
    let size = bytes / 1024;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex += 1;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
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
