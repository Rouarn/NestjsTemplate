import { AppConfigService } from '@/config';
import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class FileValidationPipe implements PipeTransform {
  constructor(private readonly appConfigService: AppConfigService) {}

  async transform(file: Express.Multer.File): Promise<Express.Multer.File> {
    if (!file) {
      throw new BadRequestException('未选择文件');
    }

    const { uploadsAllowedTypes, uploadsMaxSize } = this.appConfigService.staticAssetsOptions;

    // 校验文件类型 (MIME type)
    const allowedTypes = Array.isArray(uploadsAllowedTypes)
      ? uploadsAllowedTypes
      : uploadsAllowedTypes.split(',');

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `不支持的文件类型: ${file.mimetype}。 允许的类型: ${allowedTypes.join(', ')}`,
      );
    }

    // 校验文件大小
    if (file.size > uploadsMaxSize) {
      throw new BadRequestException(
        `文件大小超出限制: ${(file.size / 1024 / 1024).toFixed(2)}MB。 最大允许: ${(
          uploadsMaxSize /
          1024 /
          1024
        ).toFixed(2)}MB`,
      );
    }

    return file;
  }
}

@Injectable()
export class FilesValidationPipe implements PipeTransform {
  constructor(private readonly appConfigService: AppConfigService) {}

  async transform(files: Express.Multer.File[]): Promise<Express.Multer.File[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('未选择文件');
    }

    const pipe = new FileValidationPipe(this.appConfigService);

    // 对每个文件进行校验
    await Promise.all(files.map((file) => pipe.transform(file)));

    return files;
  }
}
