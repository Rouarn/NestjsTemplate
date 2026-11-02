import { Column, Index } from 'typeorm';

/**
 * 数据库基础实体抽象类
 *
 * @description
 * 所有业务实体类都应继承此类。它提供基础的审计字段（创建时间、更新时间）。
 *
 * 时间戳的权威来源是表结构：`DEFAULT CURRENT_TIMESTAMP(6)` 与
 * `ON UPDATE CURRENT_TIMESTAMP(6)`。应用层不再叠加实体订阅器或自定义命名策略，
 * 避免多套机制互相覆盖；`created_at` 上建有索引以支撑按时间排序的分页查询。
 *
 * @abstract
 * @class BaseEntity
 */
export abstract class BaseEntity {
  /**
   * 创建时间
   *
   * @description
   * 记录数据行首次插入数据库的时间。
   * 如果启用自动时间戳，将在插入时自动赋值。
   */
  @Index()
  @Column({
    name: 'created_at',
    comment: '创建时间',
    type: 'datetime',
    precision: 6,
    nullable: false,
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  createdAt!: Date;

  /**
   * 更新时间
   *
   * @description
   * 记录数据行最后一次更新的时间。
   * 如果启用自动时间戳，将在更新时自动赋值。
   */
  @Column({
    name: 'updated_at',
    comment: '更新时间',
    type: 'datetime',
    precision: 6,
    nullable: false,
    default: () => 'CURRENT_TIMESTAMP(6)',
    onUpdate: 'CURRENT_TIMESTAMP(6)',
  })
  updatedAt!: Date;
}
