import { SetMetadata } from '@nestjs/common';
import { AUTH_METADATA_KEYS } from '../constants/index.js';

/**
 * 公共路由标识键
 * 用于在元数据中标记路由是否为公共访问
 */
export const IS_PUBLIC_KEY = AUTH_METADATA_KEYS.IS_PUBLIC;

/**
 * 公共路由装饰器（Public）
 *
 * 用于标记无需身份认证即可访问的公共路由。
 *
 * @returns 设置公共路由元数据的装饰器
 */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);
