import type { AppConfigService } from '@/config';
import { Logger } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { ServeStaticOptions } from '@nestjs/platform-express/interfaces/serve-static-options.interface';
import { exec } from 'child_process';
import { promisify } from 'util';

export class BootstrapLogHelper {
  private static readonly logger = new Logger('Bootstrap');

  /**
   * 打开指定 URL 在默认浏览器中
   */
  static async openBrowser(url: string): Promise<void> {
    const startCommand =
      process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';

    try {
      const execPromise = promisify(exec);
      if (process.platform === 'win32') {
        await execPromise(`${startCommand} "" "${url}"`);
      } else {
        await execPromise(`${startCommand} "${url}"`);
      }
    } catch (e) {
      // 忽略打开浏览器失败的错误，避免掩盖原始错误
      this.logger.error(`无法打开浏览器: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  /**
   * 输出静态资源配置信息
   */
  static logStaticResourceConfig(
    staticConfig: { root: string; options: ServeStaticOptions },
    staticPath: string,
  ): void {
    this.logger.log('');
    this.logger.log('╔═══════════════════════════════════════════════════════════════════╗');
    this.logger.log('║                     📁 静态资源配置 📁                            ║');
    this.logger.log('╚═══════════════════════════════════════════════════════════════════╝');
    this.logger.log('');
    this.logger.log('┌─ 📂 配置详情 ───────────────────────────────────────────────────┐');
    this.logger.log(`│ 📂 配置根目录: ${staticConfig.root}`);
    this.logger.log(`│ ⚙️  配置选项: ${JSON.stringify(staticConfig.options)}`);
    this.logger.log(`│ 📍 当前目录: ${__dirname}`);
    this.logger.log(`│ 🎯 解析路径: ${staticPath}`);
    this.logger.log('└─────────────────────────────────────────────────────────────────┘');
    this.logger.log('');
  }

  /**
   * 记录API文档保存信息
   */
  static logApiDocumentSaved(
    apiDocPath: string,
    baseUrl: string,
    staticPrefix?: string,
    filename?: string,
  ): void {
    this.logger.log(`📄 API文档已保存到: ${apiDocPath}`);
    this.logger.log(`🔗 API文档访问地址: ${baseUrl}${staticPrefix ?? ''}/${filename}`);
  }

  /**
   * 记录应用启动成功信息
   */
  static async logApplicationStartup(
    app: NestExpressApplication,
    appConfig: AppConfigService,
    versionConfig: {
      prefix: string;
      defaultVersion: string;
      type: 'uri' | 'header';
      header: string;
    },
    staticConfig: { root: string; options: ServeStaticOptions },
  ): Promise<void> {
    const appUrl = await app.getUrl();
    const apiUrl =
      versionConfig.type === 'uri'
        ? `${appUrl}/${versionConfig.prefix}/v${versionConfig.defaultVersion}`
        : `${appUrl}/${versionConfig.prefix}`;

    this.logger.log('');
    this.logger.log('╔' + '═'.repeat(68) + '╗');
    this.logger.log('║' + ' '.repeat(20) + '🚀 NestJS 应用启动成功! 🚀' + ' '.repeat(22) + '║');
    this.logger.log('╚' + '═'.repeat(68) + '╝');
    this.logger.log('');
    this.logger.log('┌─ 📋 应用信息 ' + '─'.repeat(51) + '┐');
    this.logger.log(`│ 🏷️  应用名称: ${appConfig.appTitle}`);
    this.logger.log(`│ 🌍 运行环境: ${appConfig.environment}`);
    this.logger.log(`│ 🚀 服务地址: ${appUrl}`);
    this.logger.log(`│ 🔗 API 访问: ${apiUrl}`);
    if (versionConfig.type === 'header') {
      this.logger.log(
        `│ 🎫 API 版本: Header: ${versionConfig.header}, Version: ${versionConfig.defaultVersion}`,
      );
    }
    this.logger.log(`│ ⚡ 端口号码: ${appConfig.port}`);
    this.logger.log('└' + '─'.repeat(65) + '┘');

    if (appConfig.swaggerOptions.enabled) {
      this.logger.log('');
      this.logger.log('┌─ 📚 API 文档服务 ' + '─'.repeat(47) + '┐');
      this.logger.log(`│ 🔗 Swagger UI: ${appUrl}${appConfig.swaggerOptions.prefix}`);
      this.logger.log(
        `│ 📄 JSON 文档: ${appUrl}${staticConfig.options.prefix ?? ''}/${appConfig.swaggerOptions.filename}`,
      );
      this.logger.log('│ 💡 提示: 可导入到 Postman、Apifox 等工具');
      this.logger.log('└' + '─'.repeat(65) + '┘');
    }

    this.logger.log('');
    this.logger.log('╔' + '═'.repeat(68) + '╗');
    this.logger.log('║' + ' '.repeat(22) + '✨ 服务已就绪，等待请求... ✨' + ' '.repeat(17) + '║');
    this.logger.log('╚' + '═'.repeat(68) + '╝');
    this.logger.log('');
  }

  /**
   * 输出应用启动失败信息
   */
  static async logApplicationError(error: unknown): Promise<void> {
    const errorMessage = error instanceof Error ? (error.stack ?? error.message) : String(error);
    this.logger.error('');
    this.logger.error('╔' + '═'.repeat(50) + '╗');
    this.logger.error('║' + ' '.repeat(13) + '❌ 应用程序启动失败 ❌' + ' '.repeat(15) + '║');
    this.logger.error('╚' + '═'.repeat(50) + '╝');
    this.logger.error('🔍 错误详情: ' + errorMessage);
    this.logger.error('💡 请检查配置文件和依赖项是否正确');
    this.logger.error('');

    // 打开浏览器 必应搜索 错误信息
    const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(errorMessage)}`;
    await this.openBrowser(searchUrl);
  }
}
