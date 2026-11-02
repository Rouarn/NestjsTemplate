import { BusinessException } from '../../common/exceptions/index.js';
import { AppConfigService, ConfigModule } from '../../config/index.js';
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as fs from 'fs/promises';
import * as multer from 'multer';
import * as os from 'os';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { FilesController } from './files.controller.js';
import { File } from './entities/index.js';
import { isBlockedUploadMime } from './files.constants.js';
import { STORAGE_ADAPTER } from './interfaces/index.js';
import { FilesService } from './services/files.service.js';
import { StorageService } from './services/storage.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([File]),
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (appConfigService: AppConfigService) => {
        const { uploadsMaxSize, uploadsMaxFiles, uploadsAllowedTypes } =
          appConfigService.staticAssetsOptions;

        // 白名单默认值为「图片 + PDF」；留空表示不做白名单限制，
        // 但可执行类型（HTML / SVG / JS / XML）始终由下方拒绝名单拦截
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
            // 先过安全拒绝名单：即使白名单被配置为放行，这些类型也一律拒绝
            if (isBlockedUploadMime(file.mimetype)) {
              return callback(
                BusinessException.badRequest(`出于安全原因不允许上传该类型: ${file.mimetype}`),
                false,
              );
            }
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
