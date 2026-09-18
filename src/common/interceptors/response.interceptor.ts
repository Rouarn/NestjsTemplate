import { DEFAULT_PAGINATION, SUCCESS_RESPONSE } from '@/common/constants';
import {
  DeveloperPaginatedResponse,
  DeveloperResponse,
  IResponse,
  PaginatedData,
  PaginatedResponse,
  PaginationParams,
} from '@/common/interfaces';
import { formatISOString } from '@/utils';
import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { extractRootMessage, isPaginatedPayload, normalizePaginatedData } from './pagination.utils';

/**
 * 响应数据格式化拦截器（ResponseInterceptor）
 *
 * 用于统一格式化所有 API 接口的响应数据结构。
 */
@Injectable()
export class ResponseInterceptor<T = unknown> implements NestInterceptor {
  /**
   * 拦截并格式化响应数据
   * @param context 执行上下文，包含请求相关信息
   * @param next 调用处理器，用于继续执行后续逻辑
   * @returns 格式化后的响应数据流
   *
   * 说明：本拦截器仅负责数据格式化；响应日志由独立的 LoggingInterceptor 处理。
   */
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<IResponse<T> | PaginatedResponse<T>> {
    return next.handle().pipe(
      map((rawData: DeveloperResponse<T> | DeveloperPaginatedResponse<T>) => {
        const request = context.switchToHttp().getRequest();
        const paginationParams = this.extractPaginationParams(request);
        let response: IResponse<T> | PaginatedResponse<T>;

        // 检查是否为分页响应（通过请求参数中的 current 和 size 判断）
        if (paginationParams && this.isDeveloperPaginatedResponse(rawData)) {
          const { data, message } = this.extractPaginatedDataAndMessage(rawData);
          const paginatedData = this.formatDeveloperPaginatedData<T>(data, paginationParams);

          response = {
            code: SUCCESS_RESPONSE.code,
            message: message ?? SUCCESS_RESPONSE.message,
            timestamp: formatISOString(),
            data: paginatedData,
          };
        } else {
          // 处理普通响应
          const { data, message } = this.extractDataAndMessage(rawData);
          response = {
            code: SUCCESS_RESPONSE.code,
            message: message ?? SUCCESS_RESPONSE.message,
            timestamp: formatISOString(),
            data,
          } as IResponse<T>;
        }

        return response;
      }),
    );
  }

  /**
   * 从请求中提取分页参数
   * @param request 请求对象
   * @returns 分页参数对象，如果不存在则返回 null
   *
   * 说明：
   * - 合并 query/body/params 三处的参数
   * - 仅当同时存在 current/size 时才视为分页请求
   */
  private extractPaginationParams(request: {
    query?: Record<string, unknown>;
    body?: Record<string, unknown>;
    params?: Record<string, unknown>;
  }): PaginationParams | null {
    const { query = {}, body = {}, params = {} } = request;

    // 合并所有参数
    const allParams = {
      ...((typeof query === 'object' && query) || {}),
      ...((typeof body === 'object' && body) || {}),
      ...((typeof params === 'object' && params) || {}),
    };

    // 检查是否包含分页参数 current 和 size
    const hasCurrent = 'current' in allParams && allParams.current != null;
    const hasSize = 'size' in allParams && allParams.size != null;

    if (hasCurrent && hasSize) {
      const current = Number(allParams.current) || DEFAULT_PAGINATION.MIN_PAGE;
      const size = Number(allParams.size) || DEFAULT_PAGINATION.DEFAULT_PAGE_SIZE;
      return { current, size };
    }

    return null;
  }

  /**
   * 基础类型守卫：判定值是否为非空对象
   * 用于后续安全地进行键存在性判断（'in' 与 hasOwnProperty）
   */
  private isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
  }

  /**
   * 类型守卫：识别包装数据格式
   * 结构：{ data: T, message?: string }
   *
   * 判定规则（严格键集合，避免 data 字段碰撞）：
   * - 必须为非空对象
   * - 必须包含自有属性 data
   * - 除 data 外，只允许出现 message（且 message 必须为字符串）
   * - 若存在 data、message 之外的其它键，则视为普通业务对象，不做拆包
   *
   * 这样普通业务对象即使含有 data 字段（如 { data: 'base64', filename: 'a.png' }），
   * 也不会被误判为包装格式。
   */
  private isWrappedData<T>(value: unknown): value is { data: T; message?: string } {
    if (!this.isObject(value)) return false;
    const keys = Object.keys(value);
    if (!keys.includes('data')) return false;

    // 仅允许 data 和 message 两个键
    const allowed = new Set(['data', 'message']);
    if (!keys.every((key) => allowed.has(key))) return false;

    // message 若存在，必须为字符串
    const message = (value as { message?: unknown }).message;
    if (message !== undefined && typeof message !== 'string') return false;

    return true;
  }

  /**
   * 类型守卫：识别仅消息格式
   * 结构：{ message: string } 且不包含 data
   * 说明：命中时返回 null 作为 data，并透传 message
   */
  private isMessageOnly(value: unknown): value is { message: string } {
    return (
      this.isObject(value) &&
      'message' in value &&
      Object.prototype.hasOwnProperty.call(value, 'message') &&
      !('data' in value)
    );
  }

  /**
   * 提取普通响应的数据和消息
   * @param rawData 原始响应数据
   * @returns 提取的数据和消息
   *
   * 支持：
   * - 直接返回数据：T
   * - 包装格式：{data: T, message?: string}
   * - 仅消息：{message: string}（此时 data 为 null）
   */
  private extractDataAndMessage<T>(rawData: DeveloperResponse<T>): {
    data: T | null;
    message?: string;
  } {
    if (this.isWrappedData<T>(rawData)) {
      const { data, message } = rawData;
      return { data, message };
    }

    if (this.isMessageOnly(rawData)) {
      return { data: null, message: rawData.message };
    }

    return { data: rawData, message: undefined };
  }

  /**
   * 提取分页响应的数据和消息
   * @param rawData 原始分页响应数据
   * @returns 提取的分页数据和消息
   *
   * 识别路径：
   * - 根或包装结构中的 list/records/data 三种数组键与 total
   * - 若根包含 message（string），作为响应消息返回
   *
   * 返回：
   * - data: 统一归一化后的 { list, total }
   * - message: string | undefined
   */
  private extractPaginatedDataAndMessage<T>(rawData: DeveloperPaginatedResponse<T>): {
    data: { list: T[]; total: number };
    message?: string;
  } {
    const rootMessage = extractRootMessage(rawData);
    const normalized = normalizePaginatedData<T>(rawData);
    return {
      data: normalized,
      message: rootMessage,
    };
  }

  /**
   * 检查是否为开发者分页响应格式
   * @param data 响应数据
   * @returns 如果是分页响应则返回 true
   *
   * 规则：
   * - 兼容根或包装结构
   * - 识别 list/records/data 三种数组键，与 total 搭配
   */
  private isDeveloperPaginatedResponse<T>(
    data: DeveloperResponse<T> | DeveloperPaginatedResponse<T>,
  ): data is DeveloperPaginatedResponse<T> {
    return isPaginatedPayload<T>(data);
  }

  /**
   * 格式化开发者分页数据为标准分页格式
   * @param data 提取后的分页数据 {list: T[], total: number}
   * @param paginationParams 分页参数
   * @returns 标准化的分页数据结构
   *
   * 输出：
   * - records: 直接映射为 list
   * - totalPages: 由 total 与 size 计算
   * - current/size: 来自请求参数
   */
  private formatDeveloperPaginatedData<T>(
    data: { list: T[]; total: number },
    paginationParams: PaginationParams,
  ): PaginatedData<T> {
    const { list, total } = data;
    const { current, size } = paginationParams;
    const totalNum = Number(total ?? 0);
    const totalPages = Math.ceil(totalNum / size);

    return {
      records: list,
      total: totalNum,
      totalPages,
      current,
      size,
    };
  }
}
