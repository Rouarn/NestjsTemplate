import { ConfigModule } from '../config/index.js';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseConfigService } from './database.config.js';
import { DatabaseService } from './database.service.js';

/**
 * 数据库核心模块
 *
 * 负责数据库连接的初始化与配置，并对外提供 `DatabaseService`
 * （连接状态、健康探活、原生 DataSource）。
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useClass: DatabaseConfigService,
    }),
  ],
  providers: [DatabaseConfigService, DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
