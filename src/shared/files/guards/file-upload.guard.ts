import { BusinessException } from '#/common/exceptions/index.js';
import { AppConfigService } from '#/config/index.js';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { UPLOAD_QUOTA_KEY, type UploadQuotaValue } from '../decorators/index.js';

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
 * 2. 按路由 @UploadQuota 元数据声明的文件数配额检查 Content-Length。
 *
 * 注意：本层只是尽力而为的早期拦截，使用 chunked 编码、不带 Content-Length
 * 的请求会跳过本层；字节级的精确限制始终由 Multer 的 limits 强制执行。
 */
@Injectable()
export class FileUploadGuard implements CanActivate {
  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const contentType = request.headers['content-type'];

    // 1. 确保是 multipart/form-data 请求
    if (!contentType?.includes('multipart/form-data')) {
      throw BusinessException.badRequest('请求内容类型必须是 multipart/form-data');
    }

    // 2. 早期大小检查 (Content-Length)，chunked 编码无此头时跳过（由 Multer limits 兜底）
    const contentLength = parseInt(request.headers['content-length'] ?? '', 10);
    if (!Number.isFinite(contentLength)) {
      return true;
    }

    const { uploadsMaxSize, uploadsMaxFiles } = this.appConfigService.staticAssetsOptions;

    // 路由配额：@UploadQuota('max') 取配置的最大文件数，未设置装饰器默认单文件
    const quota = this.reflector.getAllAndOverride<UploadQuotaValue>(UPLOAD_QUOTA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const maxFiles = quota === 'max' ? uploadsMaxFiles : (quota ?? 1);

    const maxBodySize = maxFiles * (uploadsMaxSize + MULTIPART_OVERHEAD_PER_FILE);

    if (contentLength > maxBodySize) {
      throw BusinessException.badRequest(
        `请求体过大: ${(contentLength / 1024 / 1024).toFixed(2)}MB。 最大允许: ${(
          maxBodySize /
          1024 /
          1024
        ).toFixed(2)}MB`,
      );
    }

    return true;
  }
}
