import Joi from 'joi';

/**
 * 环境变量验证模式
 *
 * 使用 Joi 库定义环境变量的验证规则，确保应用启动时所有必需的配置都存在且格式正确。
 */
export const validationSchema = Joi.object({
  // 应用基础配置
  NEST_APP_TITLE: Joi.string().default('NestJS Template'),
  NEST_PORT: Joi.number().default(3000),
  NEST_BASE_URL: Joi.string().default('http://localhost:3000'),
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),

  // 静态资源和文件上传统一配置
  NEST_STATIC_ASSETS_DIR: Joi.string().default('./static'), // 静态资源存储路径
  NEST_STATIC_ASSETS_MAXAGE: Joi.number().default(86400), // 24小时缓存
  NEST_STATIC_ASSETS_PREFIX: Joi.string().default('/static'), // 静态资源访问前缀

  // 文件上传配置
  NEST_STATIC_UPLOAD_PATH: Joi.string().default('./uploads'), // 文件上传存储路径
  NEST_UPLOAD_MAX_SIZE: Joi.number().default(10485760), // 10MB
  NEST_UPLOAD_ALLOWED_TYPES: Joi.string().default(''), // 空字符串表示允许所有类型
  NEST_UPLOAD_MAX_FILES: Joi.number().default(10), // 同时最大上传文件数量

  // API 版本控制配置
  API_PREFIX: Joi.string().default('api'),
  API_DEFAULT_VERSION: Joi.string().default('1'),
  API_VERSIONING_TYPE: Joi.string().valid('uri', 'header').default('header'),
  API_VERSIONING_HEADER: Joi.string().default('X-Api-Version'),

  // JWT 认证配置
  NEST_JWT_SECRET: Joi.string().required(),
  NEST_JWT_ACCESS_TOKEN_TTL: Joi.number().default(3600),
  NEST_JWT_REFRESH_TOKEN_TTL: Joi.number().default(604800),
  NEST_BCRYPT_SALT_ROUNDS: Joi.number().default(10).min(4).max(31),
  NEST_AUTH_MAX_LOGIN_ATTEMPTS: Joi.number().default(5),
  NEST_AUTH_BASE_LOCK_DURATION: Joi.number().default(1800),
  NEST_AUTH_MAX_LOCK_DURATION: Joi.number().default(86400),

  // Swagger API 文档配置
  NEST_SWAGGER_TITLE: Joi.string().default('API Documentation'),
  NEST_SWAGGER_DESCRIPTION: Joi.string().default('API文档'),
  NEST_SWAGGER_VERSION: Joi.string().default('1.0'),
  NEST_SWAGGER_PREFIX: Joi.string().default('/api-docs'),
  NEST_SWAGGER_FILENAME: Joi.string().default('api-docs.json'),

  // Redis 缓存配置 (可选)
  NEST_REDIS_ENABLED: Joi.string().valid('true', 'false').default('true'),
  NEST_REDIS_HOST: Joi.string().default('localhost'),
  NEST_REDIS_PORT: Joi.number().default(6379),
  NEST_REDIS_PASSWORD: Joi.string().allow('').optional(),
  NEST_REDIS_DB: Joi.number().default(0),
  NEST_REDIS_DEFAULT_TTL: Joi.number().default(3600),
  NEST_REDIS_KEY_PREFIX: Joi.string().default('nestjs:'),

  // CORS 跨域配置
  NEST_CORS_ORIGINS: Joi.string().optional(),

  // 数据库配置 (必需)
  NEST_DATABASE_HOST: Joi.string().default('localhost'),
  NEST_DATABASE_PORT: Joi.number().default(3306),
  NEST_DATABASE_USER: Joi.string().required(),
  NEST_DATABASE_PASSWORD: Joi.string().required(),
  NEST_DATABASE_NAME: Joi.string().required(),
  NEST_DATABASE_TABLE_PREFIX: Joi.string().allow('').optional().default('ra_'),
  NEST_DATABASE_ENABLE_TIMESTAMPS: Joi.boolean().default(true),
  NEST_DATABASE_CREATED_AT: Joi.string().default('createdAt'),
  NEST_DATABASE_UPDATE_AT: Joi.string().default('updatedAt'),

  // 日志配置
  NEST_LOGGER_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'verbose')
    .default('info'),
  NEST_LOGGER_DIR: Joi.string().default('./logs'),
  NEST_LOGGER_MAX_FILES: Joi.string().default('14d'),
  NEST_LOGGER_MAX_SIZE: Joi.string().default('20m'),
});
