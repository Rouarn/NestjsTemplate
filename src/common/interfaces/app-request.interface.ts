import type { Request } from 'express';
import type { CurrentUser } from './current-user.interface.js';

/**
 * 应用请求类型
 *
 * 在 Express 原生 Request 基础上，补充运行期由各组件注入的自定义字段：
 * - `requestId` / `startTime`：由 LoggerMiddleware 在请求入口注入
 * - `user`：由 JwtAuthGuard 完成 JWT 校验后注入
 *
 * 设计说明：
 * 通过 getRequest<AppRequest>() 等泛型在使用点显式标注，
 * 不使用全局模块扩展（declare global）污染所有 Express Request，
 * 字段定义集中维护，避免中间件/拦截器/过滤器各自重复声明。
 */
export interface AppRequest extends Request {
  /** 请求追踪 ID（LoggerMiddleware 注入） */
  requestId?: string;

  /** 请求开始时间戳（LoggerMiddleware 注入，用于统计耗时） */
  startTime?: number;

  /** 当前登录用户（JwtAuthGuard 校验通过后注入；公开路由或 Guard 之前可能不存在） */
  user?: CurrentUser;
}
