import { registerAs } from '@nestjs/config';
import type { AppConfig, Environment } from './types';

/**
 * 应用配置工厂函数
 *
 * 从环境变量中读取配置值，并提供合理的默认值。
 * 使用类型定义确保配置结构的一致性和类型安全。
 */
export default registerAs('app', (): AppConfig => {
  // 环境变量辅助函数
  const getEnvVar = <T>(key: string, defaultValue: T): T => {
    const value = process.env[key];
    if (value === undefined) return defaultValue;

    // 处理数字类型
    if (typeof defaultValue === 'number') {
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? defaultValue : (parsed as unknown as T);
    }

    // 处理布尔类型
    if (typeof defaultValue === 'boolean') {
      return (value === 'true') as unknown as T;
    }

    // 处理字符串数组类型
    if (Array.isArray(defaultValue)) {
      return value.split(',').map((item) => item.trim()) as unknown as T;
    }

    return value as unknown as T;
  };

  // 获取环境变量
  const environment = getEnvVar<Environment>('NODE_ENV', 'development');

  return {
    // 应用基础配置
    title: getEnvVar('NEST_APP_TITLE', 'NestJS Template'),
    port: getEnvVar('NEST_PORT', 3000),
    baseUrl: getEnvVar('NEST_BASE_URL', 'http://localhost:3000'),
    environment,

    // API 版本控制配置
    api: {
      prefix: getEnvVar('API_PREFIX', 'api'),
      version: getEnvVar('API_DEFAULT_VERSION', '1'),
      type: getEnvVar('API_VERSIONING_TYPE', 'header'),
      header: getEnvVar('API_VERSIONING_HEADER', 'X-Api-Version'),
    },

    // JWT 认证配置
    jwt: {
      secret: getEnvVar('NEST_JWT_SECRET', 'your-secret-key'),
      accessTokenTtl: getEnvVar('NEST_JWT_ACCESS_TOKEN_TTL', 3600),
      refreshTokenTtl: getEnvVar('NEST_JWT_REFRESH_TOKEN_TTL', 604800),
    },

    // Bcrypt 加密配置
    bcrypt: {
      saltRounds: getEnvVar('NEST_BCRYPT_SALT_ROUNDS', 10),
    },

    // 认证安全配置
    auth: {
      maxLoginAttempts: getEnvVar('NEST_AUTH_MAX_LOGIN_ATTEMPTS', 5),
      baseLockDuration: getEnvVar('NEST_AUTH_BASE_LOCK_DURATION', 1800),
      maxLockDuration: getEnvVar('NEST_AUTH_MAX_LOCK_DURATION', 86400),
    },

    // 静态资源和文件上传配置
    static: {
      root: getEnvVar('NEST_STATIC_ASSETS_DIR', './static'),
      prefix: getEnvVar('NEST_STATIC_ASSETS_PREFIX', '/static'),
      uploadsAllowedTypes: getEnvVar('NEST_UPLOAD_ALLOWED_TYPES', ''),
      uploadsMaxSize: getEnvVar('NEST_UPLOAD_MAX_SIZE', 10 * 1024 * 1024), // 10MB
      uploadsMaxFiles: getEnvVar('NEST_UPLOAD_MAX_FILES', 10), // 最多同时上传10个文件
    },

    // CORS 跨域配置
    cors: {
      origin: getEnvVar('NEST_CORS_ORIGINS', []),
      credentials: true,
    },

    // Swagger API 文档配置
    swagger: {
      title: getEnvVar('NEST_SWAGGER_TITLE', 'API Documentation'),
      description: getEnvVar('NEST_SWAGGER_DESCRIPTION', 'API文档'),
      version: getEnvVar('NEST_SWAGGER_VERSION', '1.0'),
      prefix: getEnvVar('NEST_SWAGGER_PREFIX', '/api-docs'),
      filename: getEnvVar('NEST_SWAGGER_FILENAME', 'api-docs.json'),
      enabled: environment !== 'production',
    },

    // Redis 缓存配置
    redis: {
      enabled: getEnvVar('NEST_REDIS_ENABLED', environment === 'development'),
      host: getEnvVar('NEST_REDIS_HOST', 'localhost'),
      port: getEnvVar('NEST_REDIS_PORT', 6379),
      password: getEnvVar('NEST_REDIS_PASSWORD', undefined),
      db: getEnvVar('NEST_REDIS_DB', 0),
      options: {
        retryDelayOnFailover: getEnvVar('NEST_REDIS_RETRY_DELAY', 100),
        enableReadyCheck: getEnvVar('NEST_REDIS_ENABLE_READY_CHECK', false),
        maxRetriesPerRequest: getEnvVar('NEST_REDIS_RETRIES', 3),
        lazyConnect: getEnvVar('NEST_REDIS_LAZY_CONNECT', true),
        keepAlive: getEnvVar('NEST_REDIS_KEEP_ALIVE', 30000),
        connectTimeout: getEnvVar('NEST_REDIS_CONNECT_TIMEOUT', 10000),
        commandTimeout: getEnvVar('NEST_REDIS_COMMAND_TIMEOUT', 5000),
      },
      cache: {
        defaultTtl: getEnvVar('NEST_REDIS_DEFAULT_TTL', 3600),
        keyPrefix: getEnvVar('NEST_REDIS_KEY_PREFIX', 'nestjs:'),
      },
    },

    // 数据库连接配置
    database: {
      type: 'mysql',
      host: getEnvVar('NEST_DATABASE_HOST', 'localhost'),
      port: getEnvVar('NEST_DATABASE_PORT', 3306),
      username: getEnvVar('NEST_DATABASE_USER', 'root'),
      password: getEnvVar('NEST_DATABASE_PASSWORD', ''),
      database: getEnvVar('NEST_DATABASE_NAME', 'nestjs_app'),
      tablePrefix: getEnvVar('NEST_DATABASE_TABLE_PREFIX', ''),
      timestamps: {
        enabled: getEnvVar('NEST_DATABASE_ENABLE_TIMESTAMPS', true),
        createdAt: getEnvVar('NEST_DATABASE_CREATED_AT', 'createdAt'),
        updatedAt: getEnvVar('NEST_DATABASE_UPDATE_AT', 'updatedAt'),
      },
      synchronize: getEnvVar('NEST_DATABASE_SYNCHRONIZE', environment === 'development'),
      logging: getEnvVar('NEST_DATABASE_LOGGING', false),
      logNotifications: false,
      extra: {
        connectionLimit: 10,
        acquireTimeout: 60000,
        timeout: 60000,
      },
    },

    // 日志配置
    logger: {
      level: getEnvVar('NEST_LOGGER_LEVEL', 'info'),
      dir: getEnvVar('NEST_LOGGER_DIR', './logs'),
      maxFiles: getEnvVar('NEST_LOGGER_MAX_FILES', '14d'),
      maxSize: getEnvVar('NEST_LOGGER_MAX_SIZE', '20m'),
    },
  };
});
