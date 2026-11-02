import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CorsOptions } from 'cors';
import type {
  ApiConfig,
  AppConfig,
  AuthSecurityConfig,
  DatabaseConfig,
  Environment,
  JwtConfig,
  LoggerConfig,
  StaticConfig,
} from './types.js';

/** 环境对应的展示后缀 */
const ENVIRONMENT_SUFFIX: Record<Environment, string> = {
  development: ' - 开发环境',
  production: ' - 生产环境',
  test: ' - 测试环境',
};

/**
 * 本地开发来源判断（仅开发/测试环境生效）
 *
 * 允许 localhost 与常见内网网段，便于前端在局域网真机联调。
 */
const LOCAL_DEV_ORIGIN =
  /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.)/;

/**
 * 应用配置服务
 *
 * 对 `ConfigService` 的类型化封装：业务代码只依赖本服务，不直接读 `process.env`。
 * 配置的默认值与校验在 `validation.schema.ts`，本服务不再做兜底或兼容处理。
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  /** 完整配置快照 */
  get raw(): AppConfig {
    return this.configService.get<AppConfig>('app')!;
  }

  // ============================== 应用基础 ==============================

  get appTitle(): string {
    const { title, environment } = this.raw;
    return `${title}${ENVIRONMENT_SUFFIX[environment]}`;
  }

  get port(): number {
    return this.raw.port;
  }

  get environment(): Environment {
    return this.raw.environment;
  }

  get isProduction(): boolean {
    return this.raw.environment === 'production';
  }

  get baseUrl(): string {
    return this.raw.baseUrl;
  }

  /** Express `trust proxy` 取值（0 表示不信任代理） */
  get trustProxy(): number {
    return this.raw.server.trustProxy;
  }

  // ============================== 认证 ==============================

  get jwtOptions(): JwtConfig {
    return this.raw.jwt;
  }

  get bcryptSaltRounds(): number {
    return this.raw.bcrypt.saltRounds;
  }

  get authSecurityOptions(): AuthSecurityConfig {
    return this.raw.auth;
  }

  // ============================== 静态资源 / 上传 ==============================

  get staticAssetsOptions(): StaticConfig {
    return this.raw.static;
  }

  // ============================== CORS ==============================

  get corsOptions(): CorsOptions {
    const allowList = this.raw.cors.origin;

    // 通配符与 credentials: true 组合等价于「反射任意 Origin 并允许携带凭证」，
    // 属于配置事故的高发点，这里直接拒绝启动。
    if (allowList.includes('*')) {
      throw new Error(
        'NEST_CORS_ORIGINS 不允许使用 "*"：本服务固定开启 credentials，请改为显式域名列表',
      );
    }

    const isDev = !this.isProduction;
    const isAllowedOrigin = (origin: string): boolean =>
      allowList.includes(origin) || (isDev && LOCAL_DEV_ORIGIN.test(origin));

    return {
      origin: (requestOrigin, callback) => {
        // 无 Origin 的请求（curl、服务间调用）不受同源策略约束，直接放行
        if (!requestOrigin) {
          return callback(null, true);
        }
        if (isAllowedOrigin(requestOrigin)) {
          return callback(null, true);
        }
        return callback(new Error(`不允许的跨域请求: ${requestOrigin}`));
      },
      credentials: true,
    };
  }

  // ============================== Swagger ==============================

  get swaggerOptions(): {
    title: string;
    description: string;
    version: string;
    prefix: string;
    filename: string;
    enabled: boolean;
  } {
    const { swagger, api } = this.raw;

    return {
      title: this.appTitle,
      description: swagger.description,
      version: `V${api.version}`,
      prefix: swagger.prefix,
      filename: swagger.filename,
      // 生产环境不挂载 Swagger：避免暴露完整接口面
      enabled: !this.isProduction,
    };
  }

  // ============================== 数据库 ==============================

  get database(): DatabaseConfig {
    return this.raw.database;
  }

  // ============================== API 版本控制 ==============================

  get apiVersioning(): {
    prefix: string;
    defaultVersion: string;
    type: 'uri' | 'header';
    header: string;
  } {
    const api: ApiConfig = this.raw.api;
    return {
      prefix: api.prefix,
      defaultVersion: api.version,
      type: api.type,
      header: api.header,
    };
  }

  // ============================== 日志 ==============================

  get loggerOptions(): LoggerConfig {
    return this.raw.logger;
  }
}
