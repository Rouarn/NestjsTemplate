import { Role, Status } from '../../common/enums/index.js';
import { BusinessException } from '../../common/exceptions/index.js';
import { AppConfigService } from '../../config/index.js';
import { DatabaseService } from '../../database/index.js';
import { Injectable, Logger } from '@nestjs/common';

/** 认证记录的最小状态快照 */
export interface AuthState {
  /** 令牌版本号：与令牌中的 `ver` 比对，不一致即视为已失效 */
  tokenVersion: number;
  /** 当前角色（以库为准，改角色后无需等待令牌过期） */
  role: Role;
  /** 账号状态 */
  status: Status;
}

/** 数据库查询结果行 */
interface AuthStateRow {
  role: Role;
  status: number;
  tokenVersion: number;
}

/** 缓存条目 */
interface CacheEntry {
  state: AuthState;
  expiresAt: number;
}

/** 缓存条目上限，防止异常流量把内存撑爆 */
const MAX_CACHE_ENTRIES = 5_000;

/**
 * 令牌版本服务
 *
 * 解决「无状态 JWT 无法吊销」的问题：
 * - 每条认证记录维护 `token_version`，签发令牌时写入 `ver` 声明；
 * - 改密、禁用、改角色等敏感操作把版本号 +1，旧令牌在下一次校验时失效；
 * - 校验结果按 `NEST_AUTH_TOKEN_CACHE_TTL` 缓存（默认 30 秒），
 *   把「每个请求一次查库」降为「每个用户每 TTL 一次查库」。
 *
 * 单实例语义：缓存位于进程内。多实例部署时，吊销最多延迟一个 TTL，
 * 且不同实例之间不共享；需要强一致请换 Redis 实现同一接口。
 */
@Injectable()
export class TokenVersionService {
  private readonly logger = new Logger(TokenVersionService.name);
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly appConfig: AppConfigService,
  ) {}

  /** 认证表名（含配置的前缀） */
  private get tableName(): string {
    return `\`${this.appConfig.database.tablePrefix}auth\``;
  }

  /**
   * 读取认证状态（带缓存）
   * @param authId 认证 ID
   * @returns 记录存在时返回状态快照，记录不存在（已删除）返回 null
   */
  async getState(authId: string): Promise<AuthState | null> {
    const cacheTtlMs = this.appConfig.authSecurityOptions.tokenVersionCacheTtl * 1000;
    const now = Date.now();

    if (cacheTtlMs > 0) {
      const hit = this.cache.get(authId);
      if (hit && hit.expiresAt > now) {
        return hit.state;
      }
    }

    const rows = await this.databaseService
      .getDataSource()
      .query<AuthStateRow[]>(
        `SELECT role, status, token_version AS tokenVersion FROM ${this.tableName} WHERE id = ? LIMIT 1`,
        [authId],
      );

    const row = rows[0];
    if (!row) {
      this.cache.delete(authId);
      return null;
    }

    const state: AuthState = {
      tokenVersion: Number(row.tokenVersion),
      role: row.role,
      status: row.status,
    };

    if (cacheTtlMs > 0) {
      this.store(authId, state, now + cacheTtlMs);
    }

    return state;
  }

  /**
   * 校验令牌是否仍然有效
   *
   * @param authId 认证 ID
   * @param tokenVersion 令牌中的 `ver` 声明
   * @returns 当前状态（角色以库为准）
   * @throws BusinessException 401 记录不存在或版本不匹配；403 账号被禁用
   */
  async assertTokenValid(authId: string, tokenVersion: number): Promise<AuthState> {
    let state: AuthState | null;

    try {
      state = await this.getState(authId);
    } catch (error) {
      this.logger.error(
        `读取令牌状态失败: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw BusinessException.unavailable('认证服务暂不可用');
    }

    if (!state) {
      throw BusinessException.unauthorized('登录状态已失效，请重新登录');
    }

    if (state.tokenVersion !== tokenVersion) {
      throw BusinessException.unauthorized('登录状态已失效，请重新登录');
    }

    if (state.status !== Status.ENABLED) {
      throw BusinessException.forbidden('账号已被禁用');
    }

    return state;
  }

  /**
   * 递增令牌版本（使该账号的所有已签发令牌失效）
   * @param authId 认证 ID
   */
  async bump(authId: string): Promise<void> {
    await this.databaseService
      .getDataSource()
      .query(`UPDATE ${this.tableName} SET token_version = token_version + 1 WHERE id = ?`, [
        authId,
      ]);

    this.cache.delete(authId);
  }

  /** 主动清除缓存（例如账号被删除后） */
  invalidate(authId: string): void {
    this.cache.delete(authId);
  }

  /** 写入缓存并控制容量 */
  private store(authId: string, state: AuthState, expiresAt: number): void {
    if (this.cache.size >= MAX_CACHE_ENTRIES) {
      this.cache.clear();
    }
    this.cache.set(authId, { state, expiresAt });
  }
}
