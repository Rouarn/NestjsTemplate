/**
 * 应用配置类型定义
 */

// 应用基础配置
export type Environment = 'development' | 'production' | 'test';

export interface AppBaseConfig {
  title: string;
  port: number;
  baseUrl: string;
  environment: Environment;
}

// JWT 认证配置
export interface JwtConfig {
  secret: string;
  accessTokenTtl: number;
  refreshTokenTtl: number;
}

// Bcrypt 加密配置
export interface BcryptConfig {
  saltRounds: number;
}

// 认证安全配置
export interface AuthSecurityConfig {
  maxLoginAttempts: number;
  baseLockDuration: number;
  maxLockDuration: number;
}

// 静态资源和文件上传配置
export interface StaticConfig {
  root: string;
  prefix: string;
  uploadsAllowedTypes: string;
  uploadsMaxSize: number;
  uploadsMaxFiles: number;
}

// CORS 跨域配置
export interface CorsConfig {
  origin: string[];
  credentials: boolean;
}

// Swagger API 文档配置
export interface SwaggerConfig {
  title: string;
  description: string;
  version: string;
  prefix: string;
  filename: string;
  enabled: boolean;
}

// Redis 缓存配置
export interface RedisCacheConfig {
  enabled: boolean;
  host: string;
  port: number;
  password?: string;
  db: number;
  options: {
    retryDelayOnFailover: number;
    enableReadyCheck: boolean;
    maxRetriesPerRequest: number;
    lazyConnect: boolean;
    keepAlive: number;
    connectTimeout: number;
    commandTimeout: number;
  };
  cache: {
    defaultTtl: number;
    keyPrefix: string;
  };
}

// 数据库连接配置
export interface DatabaseConfig {
  type: 'mysql';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  tablePrefix: string;
  timestamps: {
    enabled: boolean;
    createdAt: string;
    updatedAt: string;
  };
  synchronize: boolean;
  logging: boolean;
  logNotifications: boolean;
  extra: {
    connectionLimit: number;
    acquireTimeout: number;
    timeout: number;
  };
}

// API 版本控制配置
export interface ApiConfig {
  prefix: string;
  version: string;
  type: 'uri' | 'header';
  header: string;
}

// 完整的应用配置
export interface AppConfig {
  title: string;
  port: number;
  baseUrl: string;
  environment: string;
  api: ApiConfig;
  jwt: JwtConfig;
  bcrypt: BcryptConfig;
  auth: AuthSecurityConfig;
  static: StaticConfig;
  cors: CorsConfig;
  swagger: SwaggerConfig;
  redis: RedisCacheConfig;
  database: DatabaseConfig;
  logger: LoggerConfig;
}

// 日志配置
export interface LoggerConfig {
  level: string;
  dir: string;
  maxFiles: string;
  maxSize: string;
}
