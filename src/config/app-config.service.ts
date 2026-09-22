import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CorsOptions } from 'cors';
import type { Environment, StaticConfig } from './types.js';

/**
 * 应用配置服务
 *
 * 提供应用程序所有配置项的统一访问接口。
 */
@Injectable()
export class AppConfigService {
  constructor(private configService: ConfigService) {}

  // 应用基础配置
  get appTitle(): string {
    const suffixMap: Record<Environment, string> = {
      development: ' - 开发环境',
      test: ' - 测试环境',
      production: ' - 生产环境',
    };

    const baseTitle = this.configService.get<string>('app.title')!;
    const environment = this.environment as Environment;
    const suffix = suffixMap[environment] ?? '';

    return `${baseTitle}${suffix}`;
  }

  get port(): number {
    return this.configService.get<number>('app.port')!;
  }

  get environment(): string {
    return this.configService.get<string>('app.environment')!;
  }

  get baseUrl(): string {
    return this.configService.get<string>('app.baseUrl')!;
  }

  get isProduction(): boolean {
    return this.environment === 'production';
  }

  // JWT 认证配置
  get jwtOptions(): {
    secret: string;
    accessTokenTtl: number;
    refreshTokenTtl: number;
  } {
    return {
      secret: this.configService.get<string>('app.jwt.secret')!,
      accessTokenTtl: this.configService.get<number>('app.jwt.accessTokenTtl')!,
      refreshTokenTtl: this.configService.get<number>('app.jwt.refreshTokenTtl')!,
    };
  }

  // Bcrypt 加密配置
  get bcryptSaltRounds(): number {
    return this.configService.get<number>('app.bcrypt.saltRounds')!;
  }

  // 认证安全配置
  get authSecurityOptions(): {
    maxLoginAttempts: number;
    baseLockDuration: number;
    maxLockDuration: number;
  } {
    return {
      maxLoginAttempts: this.configService.get<number>('app.auth.maxLoginAttempts')!,
      baseLockDuration: this.configService.get<number>('app.auth.baseLockDuration')!,
      maxLockDuration: this.configService.get<number>('app.auth.maxLockDuration')!,
    };
  }

  // 静态资源服务配置
  get staticAssetsOptions(): StaticConfig {
    return {
      root: this.configService.get<string>('app.static.root')!,
      prefix: this.configService.get<string>('app.static.prefix')!,
      uploadsAllowedTypes: this.configService.get<string>('app.static.uploadsAllowedTypes')!,
      uploadsMaxSize: this.configService.get<number>('app.static.uploadsMaxSize')!,
      uploadsMaxFiles: this.configService.get<number>('app.static.uploadsMaxFiles')!,
    };
  }

  // CORS 跨域配置
  get corsOptions(): CorsOptions {
    const allowList = this.configService.get<string[]>('app.cors.origin')!;

    // 生产环境：严格检查 Origin
    if (this.isProduction) {
      return {
        origin: (requestOrigin, callback) => {
          // 允许无 Origin 的请求 (如 curl, postman, server-to-server)
          if (!requestOrigin) {
            return callback(null, true);
          }

          // 检查是否在允许列表中
          if (allowList.includes('*') || allowList.includes(requestOrigin)) {
            return callback(null, true);
          }

          callback(new Error('不允许的跨域请求'));
        },
        credentials: true,
      };
    }

    // 开发/测试环境：允许所有 localhost 和局域网 IP
    return {
      origin: (requestOrigin, callback) => {
        if (!requestOrigin) {
          return callback(null, true);
        }

        // 允许白名单中的域名
        if (allowList.includes('*') || allowList.includes(requestOrigin)) {
          return callback(null, true);
        }

        // 允许本地开发环境
        // 匹配: localhost, 127.0.0.1, 192.168.x.x, 10.x.x.x, 172.16-31.x.x
        const isLocalDev =
          /^(http|https):\/\/(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(
            requestOrigin,
          );

        if (isLocalDev) {
          return callback(null, true);
        }

        callback(null, false);
      },
      credentials: true,
    };
  }

  // Swagger API 文档配置
  get swaggerOptions(): {
    title: string;
    description: string;
    version: string;
    prefix: string;
    filename: string;
    enabled: boolean;
  } {
    const suffixMap: Record<Environment, string> = {
      development: ' - 开发版',
      test: ' - 测试版',
      production: ' - 生产版',
    };
    const environment = this.environment as Environment;
    const suffix = suffixMap[environment] ?? '';

    const baseTitle = this.configService.get<string>('app.swagger.title')!;
    const description = this.configService.get<string>('app.swagger.description')!;
    const title = `${baseTitle}${suffix}`;

    return {
      title,
      description,
      version: `V${this.configService.get<string>('app.api.version')!}`,
      prefix: this.configService.get<string>('app.swagger.prefix')!,
      filename: this.configService.get<string>('app.swagger.filename')!,
      enabled: environment !== 'production',
    };
  }

  // 数据库连接配置
  get databaseConfig(): {
    type: 'mysql';
    host: string;
    port: number;
    username: string | undefined;
    password: string | undefined;
    database: string | undefined;
    tablePrefix: string;
    timestamps: {
      enabled: boolean;
      createdAt: string;
      updatedAt: string;
    };
    synchronize: boolean;
    logging: boolean;
    logger: 'simple-console';
  } {
    return {
      type: 'mysql' as const,
      host: this.configService.get<string>('app.database.host')!,
      port: this.configService.get<number>('app.database.port')!,
      username: this.configService.get<string>('app.database.username'),
      password: this.configService.get<string>('app.database.password'),
      database: this.configService.get<string>('app.database.database'),
      tablePrefix: this.configService.get<string>('app.database.tablePrefix')!,
      timestamps: {
        enabled: this.configService.get<boolean>('app.database.timestamps.enabled')!,
        createdAt: this.configService.get<string>('app.database.timestamps.createdAt')!,
        updatedAt: this.configService.get<string>('app.database.timestamps.updatedAt')!,
      },
      synchronize: this.configService.get<boolean>('app.database.synchronize')!,
      logging: this.configService.get<boolean>('app.database.logging')!,
      logger: 'simple-console' as const,
    };
  }

  // API 版本控制配置
  get apiVersioning(): {
    prefix: string;
    defaultVersion: string;
    type: 'uri' | 'header';
    header: string;
  } {
    return {
      prefix: this.configService.get<string>('app.api.prefix')!,
      defaultVersion: this.configService.get<string>('app.api.version')!,
      type: this.configService.get<'uri' | 'header'>('app.api.type')!,
      header: this.configService.get<string>('app.api.header')!,
    };
  }

  // 日志配置
  get loggerOptions(): {
    level: string;
    dir: string;
    maxFiles: string;
    maxSize: string;
  } {
    return {
      level: this.configService.get<string>('app.logger.level')!,
      dir: this.configService.get<string>('app.logger.dir')!,
      maxFiles: this.configService.get<string>('app.logger.maxFiles')!,
      maxSize: this.configService.get<string>('app.logger.maxSize')!,
    };
  }
}
