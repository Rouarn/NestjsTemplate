import { Column } from 'typeorm';

/**
 * 数据库基础实体抽象类
 *
 * @description
 * 所有业务实体类都应继承此类。它提供了基础的审计字段（创建时间和更新时间）。
 *
 * 具体地列名映射（如 createTime, updateTime）由 {@link CustomNamingStrategy} 处理。
 * 字段的自动更新逻辑由 {@link DatabaseSubscriber} 通过依赖注入 AppConfigService 动态控制。
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

  /**
   * 软删除标识
   *
   * @description
   * 0-未删除, 1-已删除
   */
  @Column({
    name: 'deleted_at',
    comment: '软删除时间',
    type: 'datetime',
    precision: 6,
    nullable: true,
  })
  deletedAt!: Date | null;
}
