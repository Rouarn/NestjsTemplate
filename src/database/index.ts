/**
 * 数据库模块统一导出
 *
 * @description
 * 导出数据库模块的所有核心服务、配置、实体基类和命名策略。
 * 外部模块应通过此入口文件引用数据库相关功能，而不是直接引用内部文件。
 */
export * from './database.config.js';
export * from './database.entity.js';
export * from './database.module.js';
export * from './database.service.js';
export * from './naming.strategy.js';
