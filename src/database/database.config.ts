import { AppConfigService } from '../config/index.js';
import { Injectable } from '@nestjs/common';
import type { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';

/**
 * 数据库配置服务
 *
 * 从 `AppConfigService` 读取已校验的连接参数，组装 TypeORM 选项。
 * 时间戳由表结构（`DEFAULT CURRENT_TIMESTAMP(6)` / `ON UPDATE`）统一维护，
 * 不再叠加实体订阅器或自定义命名策略，避免三套机制互相覆盖。
 */
@Injectable()
export class DatabaseConfigService implements TypeOrmOptionsFactory {
  constructor(private readonly appConfigService: AppConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const db = this.appConfigService.database;

    return {
      type: 'mysql',
      host: db.host,
      port: db.port,
      username: db.username,
      password: db.password,
      database: db.database,

      // 自动加载各模块 forFeature 注册的实体
      autoLoadEntities: true,

      // 生产环境强制关闭：结构变更必须走迁移脚本，避免自动 DDL 造成数据丢失
      synchronize: this.appConfigService.isProduction ? false : db.synchronize,

      logging: db.logging,
      logger: 'simple-console',

      // 统一的表名前缀
      entityPrefix: db.tablePrefix,

      // 连接池：按实例配置，避免不同环境写死同一个值
      extra: {
        connectionLimit: db.poolSize,
      },

      // 'Z' 表示 UTC，跨时区部署时数据库内不出现本地时间
      timezone: 'Z',
      charset: 'utf8mb4_unicode_ci',

      // 启动阶段的重试策略：数据库未就绪时给出可预期的重试窗口
      retryAttempts: 5,
      retryDelay: 2000,
    };
  }
}
