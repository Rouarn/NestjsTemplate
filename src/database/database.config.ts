import { AppConfigService } from '#/config/index.js';
import { Injectable } from '@nestjs/common';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { CustomNamingStrategy } from './naming.strategy.js';

/**
 * 数据库配置服务
 *
 * @description
 * 实现 TypeOrmOptionsFactory 接口，用于动态生成 TypeORM 模块的配置。
 * 负责从全局配置服务 (AppConfigService) 获取数据库配置参数，并构建 TypeOrmModuleOptions 对象。
 * 此外，它还注入了自定义的命名策略 (CustomNamingStrategy)。
 *
 * @class DatabaseConfigService
 * @implements {TypeOrmOptionsFactory}
 */
@Injectable()
export class DatabaseConfigService implements TypeOrmOptionsFactory {
  constructor(private readonly appConfigService: AppConfigService) {}

  /**
   * 创建 TypeORM 配置选项
   *
   * @description
   * 此方法由 NestJS 的 TypeORM 模块在启动时调用。
   *
   * @returns {TypeOrmModuleOptions} TypeORM 模块的完整配置对象
   */
  createTypeOrmOptions(): TypeOrmModuleOptions {
    const dbConfig = this.appConfigService.databaseConfig;
    const synchronize = this.appConfigService.isProduction ? false : dbConfig.synchronize;

    return {
      // 数据库连接基本信息
      type: dbConfig.type,
      host: dbConfig.host,
      port: dbConfig.port,
      username: dbConfig.username,
      password: dbConfig.password,
      database: dbConfig.database,

      // 自动加载实体
      // 自动扫描并加载当前模块及子模块中注册的实体
      autoLoadEntities: true,

      // 同步数据库结构
      // 注意：在生产环境 (Production) 中应严格禁用此选项，以免造成数据丢失
      synchronize: synchronize,

      // 日志配置
      logging: dbConfig.logging,
      logger: dbConfig.logger,

      // 表前缀配置
      // 为所有自动生成的表名添加统一前缀
      entityPrefix: dbConfig.tablePrefix,

      // 自定义命名策略
      // 处理时间戳字段名 (createdAt, updatedAt) 的映射逻辑
      namingStrategy: new CustomNamingStrategy({
        timestamps: {
          createTime: dbConfig.timestamps.createdAt,
          updateTime: dbConfig.timestamps.updatedAt,
        },
      }),

      // 连接池配置
      extra: {
        connectionLimit: 10, // 限制最大连接数
      },

      // 时区配置
      // 'Z' 表示使用 UTC 时间，这对于跨时区应用非常重要，确保数据库存储的是标准时间
      timezone: 'Z',
    };
  }
}
