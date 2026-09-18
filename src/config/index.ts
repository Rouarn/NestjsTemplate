/**
 * 配置模块统一导出
 *
 * 提供应用程序所需的所有配置选项和服务的统一入口。
 */

// 导出配置服务实例
export { AppConfigService } from './app-config.service.js';
export { ConfigModule } from './config.module.js';
export * from './types.js';
export { validationSchema } from './validation.schema.js';
