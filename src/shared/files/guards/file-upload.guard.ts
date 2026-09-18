import { BusinessException } from '@/common/exceptions';
import { AppConfigService } from '@/config';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';

/**
 * 每个 multipart 文件的协议开销预算（boundary、Content-Disposition 等头部）。
 * Content-Length 包含这些非文件字节，预检时需要预留，避免误拒刚好达到上限的文件。
 */
const MULTIPART_OVERHEAD_PER_FILE = 64 * 1024; // 64KB

/**
 * 文件上传预检守卫
 *
 * 在 Multer 解析 multipart/form-data 之前进行早期的请求头检查。
 * 1. 检查 Content-Type 是否为 multipart/form-data。
 * 2. 按目标接口（单文件/多文件）的总限额检查 Content-Length。
 *
 * 注意：本层只是尽力而为的早期拦截，使用 chunked 编码、不带 Content-Length
 * 的请求会跳过本层；字节级的精确限制始终由 Multer 的 limits 强制执行。
 */
@Injectable()
export class FileUploadGuard implements CanActivate {
  constructor(private readonly appConfigService: AppConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const contentType = request.headers['content-type'];

    // 1. 确保是 multipart/form-data 请求
    if (!contentType?.includes('multipart/form-data')) {
      throw BusinessException.badRequest('请求内容类型必须是 multipart/form-data');
    }

    // 2. 早期大小检查 (Content-Length)
    const contentLength = request.headers['content-length'];

    if (contentLength) {
      const { uploadsMaxSize, uploadsMaxFiles } = this.appConfigService.staticAssetsOptions;

      // 多文件接口按 uploadsMaxFiles 个文件的总量计算，单文件接口按 1 个计算
      const isMultipleEndpoint = request.path?.endsWith('/multiple') ?? false;
      const fileCount = isMultipleEndpoint ? uploadsMaxFiles : 1;

      const maxBodySize = uploadsMaxSize * fileCount + MULTIPART_OVERHEAD_PER_FILE * fileCount;
      const sizeInBytes = parseInt(contentLength, 10);

      if (sizeInBytes > maxBodySize) {
        throw BusinessException.badRequest(
          `请求体过大: ${(sizeInBytes / 1024 / 1024).toFixed(2)}MB。 最大允许: ${(
            maxBodySize /
            1024 /
            1024
          ).toFixed(2)}MB`,
        );
      }
    }

    return true;
  }
}
