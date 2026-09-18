import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { AppConfigService } from './app-config.service.js';
import configuration from './configuration.js';
import { validationSchema } from './validation.schema.js';

/**
 * 配置模块（ConfigModule）
 *
 * 全局配置模块，负责加载和验证应用程序的所有配置。
 */
@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      load: [configuration],
      validationSchema,
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV ?? 'development'}`, '.env'],
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class ConfigModule {}
