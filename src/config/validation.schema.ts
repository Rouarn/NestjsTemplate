import Joi from 'joi';

/**
 * 环境变量校验模式
 *
 * 本文件是配置的**唯一事实源**：默认值只在这里声明（`configuration.ts` 不再提供默认值），
 * 避免出现两处默认值互相覆盖；校验结果会被 `@nestjs/config` 写回 `process.env`。
 *
 * 兜底约定：
 * - 除两个 JWT 密钥外，所有配置都带合理默认值，`.env` 可以只写需要覆盖的项；
 * - 密钥必须显式提供且长度足够 —— 这类「缺了也能跑」的兜底反而是安全风险。
 *
 * 新增配置项时必须同步更新：本文件、`configuration.ts`、`types.ts`、`.env.example`。
 */
export const validationSchema = Joi.object({
  // ============================== 应用基础 ==============================
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  NEST_APP_TITLE: Joi.string().default('NestJS Template'),
  NEST_PORT: Joi.number().port().default(3000),
  NEST_BASE_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .default('http://localhost:3000'),
  // 反向代理层数：0 表示不信任代理（默认，最安全）；Nginx / LB 之后通常设为 1
  NEST_TRUST_PROXY: Joi.number().integer().min(0).max(10).default(0),

  // ============================== API 版本控制 ==============================
  NEST_API_PREFIX: Joi.string().default('api'),
  NEST_API_DEFAULT_VERSION: Joi.string().default('1'),
  NEST_API_VERSIONING_TYPE: Joi.string().valid('uri', 'header').default('header'),
  NEST_API_VERSIONING_HEADER: Joi.string().default('X-Api-Version'),

  // ============================== JWT（必填，无默认值） ==============================
  // HS256 的密钥长度不应低于哈希输出的一半（32 字节）
  NEST_JWT_SECRET: Joi.string().min(32).required(),
  // 刷新令牌必须使用与访问令牌**不同**的密钥，长度同样 >= 32
  NEST_JWT_REFRESH_SECRET: Joi.string()
    .min(32)
    .invalid(Joi.ref('NEST_JWT_SECRET'))
    .required()
    .messages({
      'any.invalid': 'NEST_JWT_REFRESH_SECRET 不能与 NEST_JWT_SECRET 相同',
    }),
  NEST_JWT_ACCESS_TOKEN_TTL: Joi.number().integer().min(60).default(3600),
  NEST_JWT_REFRESH_TOKEN_TTL: Joi.number().integer().min(300).default(604800),

  // ============================== 认证安全 ==============================
  NEST_BCRYPT_SALT_ROUNDS: Joi.number().integer().min(10).max(15).default(12),
  NEST_AUTH_MAX_LOGIN_ATTEMPTS: Joi.number().integer().min(1).default(5),
  NEST_AUTH_BASE_LOCK_DURATION: Joi.number().integer().min(1).default(1800),
  NEST_AUTH_MAX_LOCK_DURATION: Joi.number().integer().min(1).default(86400),
  // 令牌版本缓存 TTL（秒）：0 = 每次请求查库；默认 30
  NEST_AUTH_TOKEN_CACHE_TTL: Joi.number().integer().min(0).max(3600).default(30),

  // ============================== 静态资源与上传 ==============================
  // 开发期运行时目录放在 deploy/ 下（仓库根目录保持干净）；打包脚本会归一化为 ./static
  NEST_STATIC_ASSETS_DIR: Joi.string().default('./deploy/static'),
  NEST_STATIC_ASSETS_PREFIX: Joi.string()
    .pattern(/^\//)
    .default('/static')
    .messages({ 'string.pattern.base': 'NEST_STATIC_ASSETS_PREFIX 必须以 / 开头' }),
  // 逗号分隔的 MIME 白名单；留空表示不限制（可执行类型仍由代码层拒绝）
  NEST_UPLOAD_ALLOWED_TYPES: Joi.string()
    .allow('')
    .default('image/jpeg,image/png,image/gif,image/webp,application/pdf'),
  NEST_UPLOAD_MAX_SIZE: Joi.number()
    .integer()
    .min(1)
    .default(10 * 1024 * 1024),
  NEST_UPLOAD_MAX_FILES: Joi.number().integer().min(1).max(50).default(10),

  // ============================== CORS ==============================
  // 逗号分隔的允许源；留空表示不额外放行（开发环境仍允许 localhost）。
  // '*' 会被应用层拒绝（与 credentials: true 冲突）。
  NEST_CORS_ORIGINS: Joi.string().allow('').default(''),

  // ============================== Swagger ==============================
  NEST_SWAGGER_TITLE: Joi.string().default('NestJS Template'),
  NEST_SWAGGER_DESCRIPTION: Joi.string().default('API documentation for NestJS Template'),
  NEST_SWAGGER_PREFIX: Joi.string().pattern(/^\//).default('/api-docs'),
  NEST_SWAGGER_FILENAME: Joi.string().default('api-docs.json'),

  // ============================== 数据库 ==============================
  NEST_DATABASE_HOST: Joi.string().default('127.0.0.1'),
  NEST_DATABASE_PORT: Joi.number().port().default(3306),
  NEST_DATABASE_USER: Joi.string().default('root'),
  NEST_DATABASE_PASSWORD: Joi.string().allow('').default(''),
  NEST_DATABASE_NAME: Joi.string().default('nestjs_template'),
  NEST_DATABASE_TABLE_PREFIX: Joi.string().allow('').default('ra_'),
  NEST_DATABASE_SYNCHRONIZE: Joi.boolean().default(false),
  NEST_DATABASE_LOGGING: Joi.boolean().default(false),
  NEST_DATABASE_POOL_SIZE: Joi.number().integer().min(1).max(100).default(10),

  // ============================== 日志 ==============================
  NEST_LOGGER_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'verbose')
    .default('info'),
  NEST_LOGGER_DIR: Joi.string().default('./deploy/logs'),
  NEST_LOGGER_MAX_FILES: Joi.string().default('14d'),
  NEST_LOGGER_MAX_SIZE: Joi.string().default('20m'),
  // 是否记录请求/响应体（默认关闭，避免密码、令牌等敏感信息落盘）
  NEST_LOG_BODY: Joi.boolean().default(false),
});
