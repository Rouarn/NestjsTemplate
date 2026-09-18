import { BusinessException } from '#/common/exceptions/index.js';
import { AppConfigService, ConfigModule } from '#/config/index.js';
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import * as fs from 'fs/promises';
import * as multer from 'multer';
import * as os from 'os';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { FilesController } from './files.controller.js';
import { STORAGE_ADAPTER } from './interfaces/index.js';
import { FilesService } from './services/files.service.js';
import { StorageService } from './services/storage.service.js';

@Module({
  imports: [
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (appConfigService: AppConfigService) => {
        const { uploadsMaxSize, uploadsMaxFiles, uploadsAllowedTypes } =
          appConfigService.staticAssetsOptions;

        // 白名单为空表示不做类型限制（与 validation.schema 的约定一致）
        const allowedTypes = uploadsAllowedTypes
          .split(',')
          .map((type) => type.trim())
          .filter(Boolean);

        // 临时目录放在系统临时目录下，与对外提供服务的静态资源目录隔离，
        // 使校验未通过的文件不会进入可访问目录
        const tempDir = path.join(os.tmpdir(), 'nestjs-upload');
        await fs.mkdir(tempDir, { recursive: true });

        return {
          // 磁盘流式存储：上传期间文件不常驻 Node 内存
          storage: multer.diskStorage({
            destination: (_req, _file, callback) => {
              callback(null, tempDir);
            },
            filename: (_req, _file, callback) => {
              callback(null, `${uuidv4()}.tmp`);
            },
          }),
          limits: {
            fileSize: uploadsMaxSize,
            files: uploadsMaxFiles,
          },
          fileFilter: (_req, file, callback) => {
            if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
              return callback(
                BusinessException.badRequest(
                  `不支持的文件类型: ${file.mimetype}。 允许的类型: ${allowedTypes.join(', ')}`,
                ),
                false,
              );
            }
            callback(null, true);
          },
        };
      },
      inject: [AppConfigService],
    }),
  ],
  controllers: [FilesController],
  providers: [
    FilesService,
    // 面向接口 token 绑定，更换存储后端时只需改这一处
    { provide: STORAGE_ADAPTER, useClass: StorageService },
  ],
  exports: [FilesService, STORAGE_ADAPTER],
})
export class FilesModule {}
