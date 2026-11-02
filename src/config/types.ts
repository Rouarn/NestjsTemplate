/**
 * 应用配置类型定义
 *
 * 这些接口描述的是 `configuration.ts` 产出的运行时结构（已由 Joi 校验并完成类型转换），
 * 业务代码应通过 `AppConfigService` 读取，不要直接访问 `process.env`。
 */

/** 运行环境 */
export type Environment = 'development' | 'production' | 'test';

/** 服务端运行参数 */
export interface ServerConfig {
  /**
   * 反向代理层数（Express `trust proxy`）
   *
   * 0 表示不信任任何代理；部署在 Nginx / 负载均衡后应设为实际层数（通常为 1），
   * 否则 `req.ip` 会退化为代理地址，限流与登录 IP 审计全部失真。
   */
  trustProxy: number;
}

/** API 版本控制配置 */
export interface ApiConfig {
  prefix: string;
  version: string;
  type: 'uri' | 'header';
  header: string;
}

/** JWT 认证配置 */
export interface JwtConfig {
  /** 访问令牌密钥 */
  secret: string;
  /** 刷新令牌独立密钥（与 secret 必须不同） */
  refreshSecret: string;
  accessTokenTtl: number;
  refreshTokenTtl: number;
}

/** Bcrypt 加密配置 */
export interface BcryptConfig {
  saltRounds: number;
}

/** 认证安全配置 */
export interface AuthSecurityConfig {
  maxLoginAttempts: number;
  baseLockDuration: number;
  maxLockDuration: number;
  /**
   * 令牌版本缓存的 TTL（秒）
   *
   * 0 表示每次请求都查库（最严格但开销最大）；默认 30 秒，
   * 意味着改密 / 禁用 / 改角色后最多 30 秒内旧令牌失效。
   */
  tokenVersionCacheTtl: number;
}

/** 静态资源和文件上传配置 */
export interface StaticConfig {
  root: string;
  prefix: string;
  uploadsAllowedTypes: string;
  uploadsMaxSize: number;
  uploadsMaxFiles: number;
}

/** CORS 跨域配置 */
export interface CorsConfig {
  origin: string[];
}

/** Swagger API 文档配置 */
export interface SwaggerConfig {
  title: string;
  description: string;
  prefix: string;
  filename: string;
}

/** 数据库连接配置 */
export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  tablePrefix: string;
  synchronize: boolean;
  logging: boolean;
  poolSize: number;
}

/** 日志配置 */
export interface LoggerConfig {
  level: string;
  dir: string;
  maxFiles: string;
  maxSize: string;
  /** 是否把请求/响应体写入日志（默认关闭，开启前请确认脱敏规则） */
  logBody: boolean;
}

/** 完整的应用配置 */
export interface AppConfig {
  title: string;
  port: number;
  baseUrl: string;
  environment: Environment;
  server: ServerConfig;
  api: ApiConfig;
  jwt: JwtConfig;
  bcrypt: BcryptConfig;
  auth: AuthSecurityConfig;
  static: StaticConfig;
  cors: CorsConfig;
  swagger: SwaggerConfig;
  database: DatabaseConfig;
  logger: LoggerConfig;
}
