import { AppConfigService } from '../../../config/index.js';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { StorageAdapter } from '../interfaces/index.js';

@Injectable()
export class StorageService implements StorageAdapter, OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly basePath: string;

  constructor(private appConfigService: AppConfigService) {
    const staticConfig = this.appConfigService.staticAssetsOptions;
    // 与 main.ts 的静态资源解析保持一致：相对路径基于 process.cwd() 解析为绝对路径
    this.basePath = path.isAbsolute(staticConfig.root)
      ? staticConfig.root
      : path.resolve(process.cwd(), staticConfig.root);
  }

  async onModuleInit(): Promise<void> {
    await this.ensureUploadDirectory();
  }

  private async ensureUploadDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
    } catch (error) {
      this.logger.error(`无法创建上传根目录: ${this.basePath}`, error);
      throw error;
    }
  }

  /**
   * 将源文件移动到本地存储
   * @param sourcePath 源文件绝对路径 (Multer 磁盘存储的临时文件)
   * @param relativePath 相对路径 (如 2024/03/uuid.jpg)
   * @returns 存储后的相对路径
   */
  async upload(sourcePath: string, relativePath: string): Promise<string> {
    const fullPath = path.join(this.basePath, relativePath);
    const directory = path.dirname(fullPath);

    try {
      // 确保子目录存在 (YYYY/MM)
      await fs.mkdir(directory, { recursive: true });

      // 优先使用 rename（同盘时几乎零成本）；临时目录与目标目录可能不在同一磁盘，
      // 此时 rename 会抛 EXDEV，回退为复制后删除源文件
      try {
        await fs.rename(sourcePath, fullPath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EXDEV') {
          throw error;
        }
        await fs.copyFile(sourcePath, fullPath);
        await fs.unlink(sourcePath);
      }

      return relativePath.replace(/\\/g, '/'); // 统一使用正斜杠
    } catch (error) {
      this.logger.error(`文件存储失败: ${sourcePath}`, error);
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
