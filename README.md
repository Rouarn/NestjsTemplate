# NestJS Template

基于 NestJS 的现代化后端 API 项目模板，内置统一配置系统、JWT 认证、文件管理、缓存（Redis/内存）、数据库 ORM（TypeORM/MySQL）、版本化 API 与 Swagger 文档等能力，开箱即用、结构清晰、易于扩展。

## 特性

- 统一配置访问：通过 `AppConfigService` 以 `app.*` 命名空间访问配置，类型安全、可维护
- 环境文件映射：支持 `.env`、`.env.development`、`.env.production`，自动映射到结构化配置
- 认证授权：JWT 登录、令牌黑名单、用户状态校验、自定义 `JwtAuthGuard`
- 文件服务：静态资源托管、上传限制、类型校验、本地存储适配器
- 缓存系统：Redis 优先，失败时自动降级为内存缓存，统一接口封装
- 数据库：TypeORM + MySQL，命名策略、时间戳字段支持
- API 版本化：URI 版本（`/api/v1`），可通过配置切换前缀与版本
- Swagger 文档：UI 与 JSON 导出，开发/测试环境自动启用
- 代码规范：ESLint + Prettier + `lint-staged` + Husky

## 技术栈

- NestJS 11、TypeScript 5
- TypeORM 0.3、MySQL 8
- ioredis 5（缓存层）
- Swagger 11（API 文档）
- ESLint、Prettier、Husky（代码质量）

## 快速开始

1. 安装依赖

```bash
pnpm install
```

2. 启动开发环境

```bash
pnpm run start:dev
```

3. 启动测试环境

```bash
pnpm run start:test
```

4. 构建与生产启动

```bash
pnpm run build:prod
pnpm run start:prod
```

## 脚本命令

- 开发启动：`pnpm run start` / `pnpm run start:dev`
- 测试启动：`pnpm run start:test` / `pnpm run start:test-watch`
- 生产构建：`pnpm run build:prod`
- 代码修复：`pnpm run code:fix`（格式化 + ESLint 修复）
- 代码检查：`pnpm run code:check`（格式化检查 + ESLint + TypeCheck）
- 环境检查：`pnpm run env:check`
- 环境初始化：`pnpm run env:setup`
- 生成资源：`pnpm run g:res`
- 部署流程：`pnpm run deploy`（修复代码 → 构建 → 生成部署资源）

## 运行要求

- Node：`>=22.18.0`
- pnpm：`>=10.15.0`

## 目录结构（关键文件）

```
src/
  app.module.ts                // 根模块，注册核心能力与业务模块
  main.ts                      // 启动文件，统一应用初始化
  config/
    app-config.service.ts      // 统一配置访问服务（AppConfigService）
    configuration.ts           // .env → 结构化配置映射（registerAs('app')）
    validation.schema.ts       // 环境变量校验（Joi）
    index.ts                   // 配置模块聚合导出
    types.ts                   // 配置类型定义
  common/
    guards/jwt-auth.guard.ts   // 自定义 JWT 守卫（黑名单/状态校验）
    services/bootstrap-logger.service.ts // 启动日志服务（自定义 ConsoleLogger）
  shared/cache/                // 缓存系统（Redis/Memory）
    interfaces/                // 缓存接口定义
    services/
      cache-factory.service.ts // 缓存工厂（选择实现、降级回退）
      redis-cache.service.ts   // Redis 缓存实现
      memory-cache.service.ts  // 内存缓存实现
  shared/files/                // 文件模块（上传/下载/存储）
    services/
      storage.service.ts       // 本地存储适配器
      storage-factory.service.ts // 存储工厂
      validation.service.ts    // 文件校验服务（大小/类型/数量）
  modules/
    auth/                      // 认证模块（登录/令牌）
    rbac/                      // RBAC 权限管理模块（角色/权限/动态检查）
    users/                     // 用户模块
```

## 配置系统说明

项目使用 `.env*` 文件提供环境变量，并通过 `src/config/configuration.ts` 映射为结构化配置，统一命名空间为 `app`。业务代码中仅通过 `AppConfigService` 访问配置，保证类型安全与集中管理。

- 结构化映射：`src/config/configuration.ts`
  - 应用：`NEST_APP_TITLE`, `NEST_PORT`, `NEST_BASE_URL`
  - API：`API_PREFIX`, `API_DEFAULT_VERSION`
  - JWT：`NEST_JWT_SECRET`, `NEST_JWT_ACCESS_TOKEN_TTL`, `NEST_JWT_REFRESH_TOKEN_TTL`
  - 静态资源：`NEST_STATIC_ASSETS_DIR`, `NEST_STATIC_ASSETS_PREFIX`, `NEST_STATIC_ASSETS_MAXAGE`, `NEST_STATIC_UPLOAD_PATH`, `NEST_UPLOAD_MAX_SIZE`, `NEST_UPLOAD_ALLOWED_TYPES`, `NEST_UPLOAD_MAX_FILES`
  - CORS：`NEST_CORS_ORIGINS`
  - Swagger：`NEST_SWAGGER_TITLE`, `NEST_SWAGGER_DESCRIPTION`, `NEST_SWAGGER_VERSION`, `NEST_SWAGGER_PREFIX`, `NEST_SWAGGER_FILENAME`
  - Redis：`NEST_REDIS_ENABLED`, `NEST_REDIS_HOST`, `NEST_REDIS_PORT`, `NEST_REDIS_PASSWORD`, `NEST_REDIS_DB`, `NEST_REDIS_RETRY_DELAY`, `NEST_REDIS_ENABLE_READY_CHECK`, `NEST_REDIS_RETRIES`, `NEST_REDIS_LAZY_CONNECT`, `NEST_REDIS_KEEP_ALIVE`, `NEST_REDIS_CONNECT_TIMEOUT`, `NEST_REDIS_COMMAND_TIMEOUT`, `NEST_REDIS_DEFAULT_TTL`, `NEST_REDIS_KEY_PREFIX`, `NEST_REDIS_MAX_SIZE`
  - 数据库：`NEST_DATABASE_HOST`, `NEST_DATABASE_PORT`, `NEST_DATABASE_USER`, `NEST_DATABASE_PASSWORD`, `NEST_DATABASE_NAME`, `NEST_DATABASE_TABLE_PREFIX`, `NEST_DATABASE_SYNCHRONIZE`, `NEST_DATABASE_LOGGING`

- 统一访问：`src/config/app-config.service.ts`
  - 应用信息：`appTitle`, `port`, `environment`, `baseUrl`, `isDevelopment`, `isProduction`
  - API 版本：`apiVersioning`（`prefix`, `defaultVersion`）
  - JWT：`jwtOptions`（`secret`, `accessTokenTtl`, `refreshTokenTtl`）
  - 静态资源：`staticAssetsOptions`（`root`, `options.prefix`, `uploads*`）
  - CORS：`corsOptions`
  - Swagger：`swaggerOptions`（开发/测试默认开启，生产默认关闭）
  - 数据库：`databaseConfig`（MySQL + 命名策略）
  - Redis：`redisConfig`（连接信息、options、高级缓存策略）

## 缓存系统

- 工厂服务：根据配置选择 Redis 或内存实现（降级容错）
  - `src/shared/cache/services/cache-factory.service.ts`
- Redis 实现：`src/shared/cache/services/redis-cache.service.ts`
  - 连接事件监听，安全执行封装，键名前缀与 TTL 统一来源于配置
- 内存实现：`src/shared/cache/services/memory-cache.service.ts`
  - TTL 过期、LRU 淘汰、定期清理
- 接口契约：`src/shared/cache/interfaces/cache.interface.ts`
  - `CacheConfig` 作为缓存模块运行参数的投影（`type`, `enabled`, `defaultTtl`, `keyPrefix`, `maxSize`）

## 文件服务

- 本地存储：`src/shared/files/services/storage.service.ts`
  - 自动创建上传目录、上传/下载/删除、URL 构建（基于 `baseUrl` 与静态前缀）
- 校验服务：`src/shared/files/services/validation.service.ts`
  - 大小、类型、批量数量校验，依赖 `AppConfigService.staticAssetsOptions`
- 验证管道：`src/common/pipes/file-validation.pipe.ts`
  - 单文件/多文件上传参数验证

## 认证授权

- 自定义守卫：`src/common/guards/jwt-auth.guard.ts`
  - 手动校验 JWT，黑名单检查、用户状态检查，支持 `@Public` 与接口白名单
- 缓存键前缀：统一通过配置 `app.redis.cache.keyPrefix` 管理黑名单等键空间

## 数据库

- TypeORM + MySQL，自动实体加载、重试策略
- 表前缀：统一通过配置 `app.database.tablePrefix` 管理
- 命名策略：`DatabaseNamingStrategy`（在 `AppModule` 注册）

## API 版本与文档

- 版本化：`/api/v{version}`，前缀与版本从配置读取（默认 `/api/v1`）
- 文档地址：
  - Swagger UI：`/api-docs`
  - JSON 导出：`/static/api-docs.json`

## 环境变量示例（开发）

创建 `.env.development`（仅示例，按需调整）：

```env
NODE_ENV=development
NEST_APP_TITLE=NestJS Template
NEST_PORT=3000
NEST_BASE_URL=http://localhost:3000

API_PREFIX=api
API_DEFAULT_VERSION=1

NEST_JWT_SECRET=your-secret-key
NEST_JWT_ACCESS_TOKEN_TTL=3600
NEST_JWT_REFRESH_TOKEN_TTL=604800

NEST_STATIC_ASSETS_DIR=./static
NEST_STATIC_ASSETS_PREFIX=/static
NEST_STATIC_ASSETS_MAXAGE=86400
NEST_STATIC_UPLOAD_PATH=./static/uploads
NEST_UPLOAD_MAX_SIZE=10485760
NEST_UPLOAD_ALLOWED_TYPES=
NEST_UPLOAD_MAX_FILES=10

NEST_CORS_ORIGINS=http://localhost:3000,http://localhost:9527

NEST_SWAGGER_TITLE=API Documentation
NEST_SWAGGER_DESCRIPTION=API文档
NEST_SWAGGER_VERSION=1.0
NEST_SWAGGER_PREFIX=/api-docs
NEST_SWAGGER_FILENAME=api-docs.json

NEST_REDIS_ENABLED=true
NEST_REDIS_HOST=127.0.0.1
NEST_REDIS_PORT=6379
NEST_REDIS_DB=0
NEST_REDIS_RETRY_DELAY=100
NEST_REDIS_ENABLE_READY_CHECK=false
NEST_REDIS_RETRIES=3
NEST_REDIS_LAZY_CONNECT=true
NEST_REDIS_KEEP_ALIVE=30000
NEST_REDIS_CONNECT_TIMEOUT=10000
NEST_REDIS_COMMAND_TIMEOUT=5000
NEST_REDIS_DEFAULT_TTL=3600
NEST_REDIS_KEY_PREFIX=nestjs:dev:
NEST_REDIS_MAX_SIZE=1000

NEST_DATABASE_HOST=localhost
NEST_DATABASE_PORT=3306
NEST_DATABASE_USER=root
NEST_DATABASE_PASSWORD=
NEST_DATABASE_NAME=nestjs_app
NEST_DATABASE_TABLE_PREFIX=
NEST_DATABASE_SYNCHRONIZE=true
NEST_DATABASE_LOGGING=false
```

## 代码质量与校验

- 统一格式检查：`pnpm run format:check`
- 代码语法检查：`pnpm run lint:check`
- 类型检查：`pnpm run type:check`
- 一键修复：`pnpm run code:fix`

## 部署

- 生产构建：`pnpm run build:prod`
- 生产启动：`pnpm run start:prod`
- 部署流程：`pnpm run deploy`（包括构建与资源生成）

## 约定与规范

- 所有业务代码中的配置访问统一使用 `AppConfigService`
- 禁止在业务代码中直接读取原始环境变量或直接使用 `ConfigService.get('app.*')`
- 环境变量变更需同时更新 `configuration.ts` 与 `validation.schema.ts`

---

如需扩展新模块，请遵循现有模块的结构与配置访问方式，并优先复用工具与约定。欢迎在此模板基础上继续演化更复杂的业务场景。
