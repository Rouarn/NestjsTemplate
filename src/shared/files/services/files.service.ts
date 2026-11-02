import { BusinessException } from '../../../common/exceptions/index.js';
import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { fileTypeFromFile } from 'file-type';
import * as fs from 'fs/promises';
import { extension as mimeExtension } from 'mime-types';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import * as path from 'path';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import type { Logger } from 'winston';
import { FileUploadResponseDto } from '../dto/index.js';
import { File } from '../entities/file.entity.js';
import { isBlockedUploadExtension, isBlockedUploadMime } from '../files.constants.js';
import type { StorageAdapter } from '../interfaces/index.js';
import { STORAGE_ADAPTER } from '../interfaces/index.js';

/**
 * 解析后的文件类型（扩展名 + MIME）
 */
interface ResolvedFileType {
  ext: string;
  mime: string;
}

@Injectable()
export class FilesService {
  constructor(
    @Inject(STORAGE_ADAPTER) private readonly storage: StorageAdapter,
    @InjectRepository(File) private readonly fileRepository: Repository<File>,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  /**
   * 上传单文件
   * @param file Multer 磁盘存储产生的文件对象（文件内容在临时目录中）
   * @param uploaderId 上传者用户ID
   * @param storedPaths 批量上传时传入，收集已落盘的存储路径用于失败回滚
   * @returns 包含访问URL的对象
   */
  async uploadSingleFile(
    file: Express.Multer.File,
    uploaderId?: string,
    storedPaths?: string[],
  ): Promise<FileUploadResponseDto> {
    let storedPath: string | undefined;

    try {
      // 1. 解析真实类型：内容可检测时做防伪校验，不可检测时信任白名单放行的声明类型
      const resolvedType = await this.resolveFileType(file);

      // 2. 生成目标文件名与日期子目录（扩展名由服务端派发，不信任原始文件名）
      const filename = `${uuidv4()}.${resolvedType.ext}`;
      const relativePath = path.join(this.getDatePath(), filename);

      // 3. 将临时文件移动到存储目录
      storedPath = await this.storage.upload(file.path, relativePath);
      storedPaths?.push(storedPath);

      // 4. 获取访问 URL 并落库文件元数据
      const [url, completeUrl] = this.storage.getUrl(storedPath);

      await this.fileRepository.save({
        originalName: this.decodeOriginalName(file.originalname),
        storedPath,
        mimeType: resolvedType.mime,
        size: file.size,
        uploaderId,
      });

      this.logger.info('file_uploaded', {
        originalName: this.decodeOriginalName(file.originalname),
        size: file.size,
        mimeType: resolvedType.mime,
        url: completeUrl,
        uploaderId: uploaderId ?? null,
      });

      return { url, completeUrl };
    } catch (error) {
      // 校验或存储失败时清理残留：临时文件 + 已落盘文件（例如落库时唯一键冲突）
      await this.removeTempFile(file);
      if (storedPath) {
        await this.storage.delete(storedPath);
        const index = storedPaths?.indexOf(storedPath) ?? -1;
        if (index >= 0) storedPaths?.splice(index, 1);
      }
      throw error;
    }
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
   * 批量上传文件（全部成功才算成功）
   *
   * 串行处理：任一文件失败时回滚已落盘的文件并删除其元数据记录，
   * 避免并发下 Promise.all 提前 reject 导致的「孤儿文件」竞态。
   * @param files 文件对象数组
   * @param uploaderId 上传者用户ID
   * @returns 包含访问URL的对象数组
   */
  async uploadMultipleFiles(
    files: Express.Multer.File[],
    uploaderId?: string,
  ): Promise<FileUploadResponseDto[]> {
    const storedPaths: string[] = [];
    const results: FileUploadResponseDto[] = [];

    try {
      for (const file of files) {
        results.push(await this.uploadSingleFile(file, uploaderId, storedPaths));
      }
      return results;
    } catch (error) {
      // 回滚：删除已落盘的文件与对应元数据记录
      await Promise.allSettled(
        storedPaths.map(async (storedPath) => {
          await this.storage.delete(storedPath);
          await this.fileRepository.delete({ storedPath });
        }),
      );
      throw error;
    }
  }

  /**
   * 解析文件的真实类型（扩展名 + MIME）
   *
   * 类型白名单的唯一事实源是环境变量 NEST_UPLOAD_ALLOWED_TYPES，
   * 由 Multer fileFilter 在解析期把关，此处不再重复校验，只做两件事：
   *
   * 1. 防伪：内容可被 file-type 检测的二进制格式（图片/压缩包/exe 等），
   *    检测结果必须与客户端声明的 mimetype 一致，防止 exe 伪装成 png。
   * 2. 派发扩展名：优先取检测结果；文本类等无 magic number 的格式检测不到，
   *    信任已被白名单放行的声明类型，用 mime-types 数据库查扩展名。
   *
   * 安全性说明：扩展名由服务端按上述规则派发（不取原始文件名），
   * 静态服务又按扩展名决定响应 Content-Type，攻击者无法控制文件的最终服务身份。
   */
  private async resolveFileType(file: Express.Multer.File): Promise<ResolvedFileType> {
    const declared = file.mimetype;

    // 声明类型命中拒绝名单时直接失败（Multer 层已拦过一次，这里做二次防御）
    if (isBlockedUploadMime(declared)) {
      throw BusinessException.badRequest(`出于安全原因不允许上传该类型: ${declared}`);
    }

    const detected = await fileTypeFromFile(file.path);

    if (detected) {
      if (isBlockedUploadMime(detected.mime)) {
        throw BusinessException.badRequest(`出于安全原因不允许上传该类型: ${detected.mime}`);
      }
      if (detected.mime !== declared) {
        throw BusinessException.badRequest(
          `文件内容与声明类型不符: 声明 ${declared}, 实际 ${detected.mime}`,
        );
      }
      return { ext: detected.ext, mime: detected.mime };
    }

    // mime-types 查不到对应扩展名时返回 false，兜底为通用二进制扩展名
    const extension = mimeExtension(declared);
    const ext = typeof extension === 'string' ? extension : 'bin';

    // 无 magic number 的文本类型（HTML/SVG/JS/XML）扩展名由声明 MIME 反查得到，
    // 这里拦死，避免静态服务按扩展名把文件渲染成可执行文档
    if (isBlockedUploadExtension(ext)) {
      throw BusinessException.badRequest(`出于安全原因不允许上传该扩展名: ${ext}`);
    }

    return { ext, mime: declared };
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
