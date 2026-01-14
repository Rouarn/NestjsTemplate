import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * 数据库服务
 *
 * @description
 * 提供数据库连接状态管理和原生 TypeORM DataSource 的访问。
 * 实现 OnModuleInit 接口以在模块初始化时检查连接状态。
 *
 * @class DatabaseService
 * @implements {OnModuleInit}
 */
@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * 模块初始化生命周期钩子
   *
   * @description
   * 在模块初始化完成后被调用。
   * 用于检查数据库连接是否成功建立，并记录相关日志。
   */
  async onModuleInit(): Promise<void> {
    if (this.dataSource.isInitialized) {
      this.logger.log('数据库连接已成功建立。');
    } else {
      this.logger.error('数据库连接失败。');
    }
  }

  /**
   * 获取原生数据库连接对象 (DataSource)
   *
   * @description
   * 返回 TypeORM 的 DataSource 实例，允许访问底层 API，
   * 如 QueryRunner、EntityManager 或执行原生 SQL 查询。
   *
   * @returns {DataSource} TypeORM 数据源实例
   */
  getDataSource(): DataSource {
    return this.dataSource;
  }

  /**
   * 检查数据库连接状态
   *
   * @description
   * 验证当前应用是否已成功连接到数据库。
   *
   * @returns {boolean} 如果已连接返回 true，否则返回 false
   */
  isConnected(): boolean {
    return this.dataSource.isInitialized;
  }
}
