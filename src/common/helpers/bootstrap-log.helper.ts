import type { AppConfigService, StaticConfig } from '../../config/index.js';
import { Logger } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';

/**
 * 启动日志辅助
 *
 * 启动阶段只输出「一眼能看懂」的少量行：环境、端口、API 前缀、文档地址、静态资源映射。
 * 不做 ASCII 横幅，也不在启动失败时触发外部动作（例如打开浏览器搜错误），
 * 避免容器/CI 环境出现意外副作用。
 */
export class BootstrapLogHelper {
  private static readonly logger = new Logger('Bootstrap');

  /** 静态资源映射（单行） */
  static logStaticResourceConfig(staticConfig: StaticConfig, staticPath: string): void {
    this.logger.log(
      `静态资源: ${staticConfig.prefix} -> ${staticPath}（上传白名单: ${
        staticConfig.uploadsAllowedTypes || '不限'
      }）`,
    );
  }

  /** API 文档落盘位置（单行） */
  static logApiDocumentSaved(
    apiDocPath: string,
    baseUrl: string,
    staticPrefix?: string,
    filename?: string,
  ): void {
    this.logger.log(`API 文档已写入: ${apiDocPath}`);
    this.logger.log(`API 文档地址: ${baseUrl}${staticPrefix ?? ''}/${filename ?? ''}`);
  }

  /** 启动成功信息（`app.getUrl()` 是异步的，必须 await） */
  static async logApplicationStartup(
    app: NestExpressApplication,
    appConfig: AppConfigService,
    versionConfig: {
      prefix: string;
      defaultVersion: string;
      type: 'uri' | 'header';
      header: string;
    },
    staticConfig: StaticConfig,
  ): Promise<void> {
    const appUrl = await app.getUrl();
    const apiUrl =
      versionConfig.type === 'uri'
        ? `${appUrl}/${versionConfig.prefix}/v${versionConfig.defaultVersion}`
        : `${appUrl}/${versionConfig.prefix}`;

    this.logger.log(
      `服务已启动: ${appConfig.appTitle}（${appConfig.environment}），端口 ${appConfig.port}`,
    );
    this.logger.log(`API 入口: ${apiUrl}`);
    this.logger.log(
      versionConfig.type === 'header'
        ? `API 版本: 请求头 ${versionConfig.header}，默认 ${versionConfig.defaultVersion}`
        : `API 版本: 路径前缀 /v${versionConfig.defaultVersion}`,
    );

    if (appConfig.swaggerOptions.enabled) {
      this.logger.log(`Swagger UI: ${appUrl}${appConfig.swaggerOptions.prefix}`);
      this.logger.log(
        `OpenAPI JSON: ${appUrl}${staticConfig.prefix}/${appConfig.swaggerOptions.filename}`,
      );
    } else {
      this.logger.log('Swagger: 生产环境已关闭');
    }
  }

  /** 启动失败信息（只记录，不触发外部动作） */
  static logApplicationError(error: unknown): void {
    const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
    this.logger.error(`应用启动失败: ${message}`);
  }
}
