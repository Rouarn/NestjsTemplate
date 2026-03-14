import { AppConfigService } from '@/config';
import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { StorageAdapter } from '../interfaces';

@Injectable()
export class StorageService implements StorageAdapter {
  private readonly logger = new Logger(StorageService.name);
  private readonly basePath: string;

  constructor(private appConfigService: AppConfigService) {
    const staticConfig = this.appConfigService.staticAssetsOptions;
    // 使用配置中的 uploadsPath
    this.basePath = staticConfig.root;
    void this.ensureUploadDirectory();
  }

  private async ensureUploadDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
    } catch (error) {
      this.logger.error(`无法创建上传根目录: ${this.basePath}`, error);
    }
  }

  /**
   * 上传文件到本地存储
   * @param file 文件对象
   * @param relativePath 相对路径 (如 2024/03/uuid.jpg)
   * @returns 存储后的相对路径
   */
  async upload(file: Express.Multer.File, relativePath: string): Promise<string> {
    const fullPath = path.join(this.basePath, relativePath);
    const directory = path.dirname(fullPath);

    try {
      // 确保子目录存在 (YYYY/MM)
      await fs.mkdir(directory, { recursive: true });

      // 写入文件
      await fs.writeFile(fullPath, file.buffer);

      return relativePath.replace(/\\/g, '/'); // 统一使用正斜杠
    } catch (error) {
      this.logger.error(`文件存储失败: ${file.originalname}`, error);
      throw error;
    }
  }

  async download(relativePath: string): Promise<Buffer> {
    const fullPath = path.join(this.basePath, relativePath);
    return await fs.readFile(fullPath);
  }

  async delete(relativePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.basePath, relativePath);
      await fs.unlink(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async exists(relativePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.basePath, relativePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 生成访问 URL
   * @param relativePath 相对路径
   * @returns [relativeUrl, completeUrl] 相对路径与完整路径
   */
  getUrl(relativePath: string): [string, string] {
    const staticConfig = this.appConfigService.staticAssetsOptions;
    const baseUrl = this.appConfigService.baseUrl;
    const cleanRelativePath = relativePath.replace(/\\/g, '/').replace(/^\//, '');

    return [
      `${staticConfig.prefix}/${cleanRelativePath}`,
      `${baseUrl}${staticConfig.prefix}/${cleanRelativePath}`,
    ];
  }
}
