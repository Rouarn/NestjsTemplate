import { registerAs } from '@nestjs/config';
import type { AppConfig, Environment } from './types.js';

/**
 * 应用配置工厂
 *
 * 单一事实源约定：
 * - 默认值、必填项与取值范围**只**在 `validation.schema.ts`（Joi）中声明，
 *   校验后的值会由 `@nestjs/config` 写回 `process.env`；
 * - 本文件只做「读取 + 类型转换」，不提供任何默认值，
 *   从而避免出现两处默认值互相覆盖（历史上 `NEST_DATABASE_TABLE_PREFIX`
 *   就曾出现 Joi 的 `ra_` 静默覆盖配置工厂 `''` 的问题）。
 *
 * 因此：新增配置项时，必须同时更新 Joi schema 与 `.env.example`。
 */
export default registerAs('app', (): AppConfig => {
  /** 读取字符串（存在性由 Joi 保证） */
  const str = (key: string): string => process.env[key] as string;

  /** 读取数字（Joi 已保证是合法数字） */
  const num = (key: string): number => Number(process.env[key]);

  /** 读取布尔（Joi 已保证是 'true' / 'false'） */
  const bool = (key: string): boolean => process.env[key] === 'true';

  /** 读取逗号分隔列表，自动去空白与空项 */
  const list = (key: string): string[] =>
    (process.env[key] ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

  return {
    title: str('NEST_APP_TITLE'),
    port: num('NEST_PORT'),
    baseUrl: str('NEST_BASE_URL'),
    environment: str('NODE_ENV') as Environment,

    server: {
      trustProxy: num('NEST_TRUST_PROXY'),
    },

    api: {
      prefix: str('NEST_API_PREFIX'),
      version: str('NEST_API_DEFAULT_VERSION'),
      type: str('NEST_API_VERSIONING_TYPE') as 'uri' | 'header',
      header: str('NEST_API_VERSIONING_HEADER'),
    },

    jwt: {
      secret: str('NEST_JWT_SECRET'),
      refreshSecret: str('NEST_JWT_REFRESH_SECRET'),
      accessTokenTtl: num('NEST_JWT_ACCESS_TOKEN_TTL'),
      refreshTokenTtl: num('NEST_JWT_REFRESH_TOKEN_TTL'),
    },

    bcrypt: {
      saltRounds: num('NEST_BCRYPT_SALT_ROUNDS'),
    },

    auth: {
      maxLoginAttempts: num('NEST_AUTH_MAX_LOGIN_ATTEMPTS'),
      baseLockDuration: num('NEST_AUTH_BASE_LOCK_DURATION'),
      maxLockDuration: num('NEST_AUTH_MAX_LOCK_DURATION'),
      tokenVersionCacheTtl: num('NEST_AUTH_TOKEN_CACHE_TTL'),
    },

    static: {
      root: str('NEST_STATIC_ASSETS_DIR'),
      prefix: str('NEST_STATIC_ASSETS_PREFIX'),
      uploadsAllowedTypes: str('NEST_UPLOAD_ALLOWED_TYPES'),
      uploadsMaxSize: num('NEST_UPLOAD_MAX_SIZE'),
      uploadsMaxFiles: num('NEST_UPLOAD_MAX_FILES'),
    },

    cors: {
      origin: list('NEST_CORS_ORIGINS'),
    },

    swagger: {
      title: str('NEST_SWAGGER_TITLE'),
      description: str('NEST_SWAGGER_DESCRIPTION'),
      prefix: str('NEST_SWAGGER_PREFIX'),
      filename: str('NEST_SWAGGER_FILENAME'),
    },

    database: {
      host: str('NEST_DATABASE_HOST'),
      port: num('NEST_DATABASE_PORT'),
      username: str('NEST_DATABASE_USER'),
      password: str('NEST_DATABASE_PASSWORD'),
      database: str('NEST_DATABASE_NAME'),
      tablePrefix: str('NEST_DATABASE_TABLE_PREFIX'),
      synchronize: bool('NEST_DATABASE_SYNCHRONIZE'),
      logging: bool('NEST_DATABASE_LOGGING'),
      poolSize: num('NEST_DATABASE_POOL_SIZE'),
    },

    logger: {
      level: str('NEST_LOGGER_LEVEL'),
      dir: str('NEST_LOGGER_DIR'),
      maxFiles: str('NEST_LOGGER_MAX_FILES'),
      maxSize: str('NEST_LOGGER_MAX_SIZE'),
      logBody: bool('NEST_LOG_BODY'),
    },
  };
});
