import { BusinessException } from '@/common/exceptions';
import { AppConfigService } from '@/config';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';

/**
 * 文件上传预检守卫
 *
 * 在 Multer 解析 multipart/form-data 之前进行早期的请求头检查。
 * 1. 检查 Content-Type 是否为 multipart/form-data。
 * 2. 检查 Content-Length 是否超过配置的最大允许值。
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
      const { uploadsMaxSize } = this.appConfigService.staticAssetsOptions;
      const sizeInBytes = parseInt(contentLength, 10);

      if (sizeInBytes > uploadsMaxSize) {
        throw BusinessException.badRequest(
          `请求体过大: ${(sizeInBytes / 1024 / 1024).toFixed(2)}MB。 最大允许: ${(
            uploadsMaxSize /
            1024 /
            1024
          ).toFixed(2)}MB`,
        );
      }
    }

    return true;
  }
}
