import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * 数据库服务
 *
 * 提供连接状态、健康探活与原生 DataSource 访问。
 */
@Injectable()
export class DatabaseService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(private readonly dataSource: DataSource) {}

  onModuleInit(): void {
    if (!this.isConnected()) {
      // TypeORM 连接失败时通常已在初始化阶段抛错；这里保留一条明确日志便于排查
      this.logger.error('数据库连接未建立');
      return;
    }
    this.logger.log('数据库连接已建立');
  }

  onApplicationShutdown(): void {
    // enableShutdownHooks 后由 TypeOrmCoreModule 关闭连接；此处仅记录生命周期
    this.logger.log('数据库连接已关闭');
  }

  /** 是否已完成初始化 */
  isConnected(): boolean {
    return this.dataSource.isInitialized;
  }

  /**
   * 健康探活：执行最小查询验证连接可用（连接对象存在但已断开时仍能发现）
   * @returns 连接可用返回 true
   */
  async ping(): Promise<boolean> {
    if (!this.isConnected()) return false;

    try {
      await this.dataSource.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  /** 原生 DataSource（事务、QueryRunner、原生 SQL） */
  getDataSource(): DataSource {
    return this.dataSource;
  }
}
