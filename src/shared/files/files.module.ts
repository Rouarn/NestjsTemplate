import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import * as multer from 'multer';
import { FilesController } from './files.controller';
import { FilesService } from './services/files.service';
import { StorageService } from './services/storage.service';

@Module({
  imports: [
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        storage: multer.memoryStorage(),
        limits: {
          fileSize: configService.get<number>('app.uploadsMaxSize'), // 10MB
          files: configService.get<number>('app.uploadsMaxFiles'), // 最多同时上传10个文件
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [FilesController],
  providers: [FilesService, StorageService],
  exports: [FilesService, StorageService],
})
export class FilesModule {}
