import { AppConfigService } from '@/config';
import { Injectable } from '@nestjs/common';
import { EntitySubscriberInterface, EventSubscriber, InsertEvent, UpdateEvent } from 'typeorm';
import { BaseEntity } from './database.entity';
import { DatabaseService } from './database.service';

/**
 * 数据库事件订阅者
 *
 * @description
 * 监听数据库实体的生命周期事件（插入、更新等）。
 * 负责根据应用配置动态处理时间戳字段的自动更新逻辑。
 *
 * 采用依赖注入模式，注入 AppConfigService 以获取配置，
 * 解决了在 Entity 装饰器中无法使用依赖注入的问题。
 */
@Injectable()
@EventSubscriber()
export class DatabaseSubscriber implements EntitySubscriberInterface<BaseEntity> {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly appConfig: AppConfigService,
  ) {
    this.databaseService.getDataSource().subscribers.push(this);
  }

  /**
   * 监听所有继承自 BaseEntity 的实体
   */
  listenTo(): typeof BaseEntity {
    return BaseEntity;
  }

  /**
   * 插入前钩子
   *
   * @description
   * 如果启用了时间戳功能，则自动设置 createdAt 和 updatedAt
   */
  beforeInsert(event: InsertEvent<BaseEntity>): void {
    if (this.appConfig.databaseConfig.timestamps.enabled) {
      const now = new Date();
      if (!event.entity.createdAt) {
        event.entity.createdAt = now;
      }
      if (!event.entity.updatedAt) {
        event.entity.updatedAt = now;
      }
    }
  }

  /**
   * 更新前钩子
   *
   * @description
   * 如果启用了时间戳功能，则自动更新 updatedAt
   */
  beforeUpdate(event: UpdateEvent<BaseEntity>): void {
    if (this.appConfig.databaseConfig.timestamps.enabled && event.entity) {
      const now = new Date();
      event.entity.updatedAt = now;
    }
  }
}
