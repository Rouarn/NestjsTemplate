import { BusinessExceptionFactory } from '@/common/exceptions';
import { AppConfigService, ConfigModule } from '@/config';
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import * as multer from 'multer';
import { FilesController } from './files.controller';
import { FilesService } from './services/files.service';
import { StorageService } from './services/storage.service';

@Module({
  imports: [
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (appConfigService: AppConfigService) => {
        const { uploadsMaxSize, uploadsMaxFiles, uploadsAllowedTypes } =
          appConfigService.staticAssetsOptions;

        const allowedTypes = Array.isArray(uploadsAllowedTypes)
          ? uploadsAllowedTypes
          : uploadsAllowedTypes.split(',');

        return {
          storage: multer.memoryStorage(),
          limits: {
            fileSize: uploadsMaxSize,
            files: uploadsMaxFiles,
          },
          fileFilter: (_req, file, callback) => {
            if (!allowedTypes.includes(file.mimetype)) {
              return callback(
                BusinessExceptionFactory.invalidParameter(
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
  providers: [FilesService, StorageService],
  exports: [FilesService, StorageService],
})
export class FilesModule {}
