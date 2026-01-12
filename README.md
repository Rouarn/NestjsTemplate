# NestJS Template

基于 NestJS 11 构建的现代化企业级后端 API 模板，集成了成熟的认证、RBAC 权限管理、文件服务与最佳实践，旨在提供开箱即用、安全可靠的开发基础。

## 🚀 核心特性

- **模块化架构**: 清晰的领域驱动设计，核心模块 (Auth, User, RBAC, Files) 职责分离。
- **高级认证系统 (Auth)**:
  - **JWT 双令牌机制**: Access Token (短效) + Refresh Token (长效)，支持自动刷新与无感续期。
  - **安全防护**: 集成 SVG 验证码 (Captcha)，bcrypt 密码强加密，防暴力破解（账号锁定策略），Token 黑名单机制。
  - **完整流程**: 登录、注册、注销、修改密码、踢出用户、在线用户监控。
- **RBAC 权限管理**:
  - **基于角色的访问控制**: 支持角色继承 (Tree Structure) 与多对多用户关联。
  - **细粒度权限**: 基于字符串的权限动作 (如 `user:create`)，支持动态权限检查。
  - **自动化引导**: 系统启动时自动初始化默认角色 (`admin`, `editor`, `user`, `guest`) 与基础权限数据。
  - **开发体验**: 提供 `@RequirePermissions()` 装饰器与全局 `PermissionsGuard`。
- **文件服务 (Files)**:
  - **本地存储适配**: 封装统一的存储接口，支持文件上传、下载与流式传输。
  - **严格校验**: 可配置的文件类型 (MIME) 与大小限制。
  - **元数据管理**: 完整记录文件信息（原名、大小、MIME、存储路径）至数据库。
- **高性能缓存 (Cache)**:
  - **多级策略**: 优先使用 Redis，连接失败自动降级为内存缓存 (Memory Cache)。
  - **统一封装**: 提供标准化的 `ICacheService` 接口，业务层无感知底层实现。
- **健壮的基础设施**:
  - **统一配置**: 基于 `AppConfigService` 的强类型配置管理。
  - **数据库**: TypeORM 0.3 + MySQL 8，支持自动迁移与实体同步。
  - **标准化响应**: 统一的 API 响应格式 (Interceptors) 与全局异常处理 (Filters)。
  - **API 文档**: 集成 Swagger (OpenAPI 3)，自动生成接口文档。
  - **数据工具**: 内置 Excel 导入导出 (`import-export`) 能力。

## 🛠 技术栈

| 类别       | 技术选型         | 说明                        |
| ---------- | ---------------- | --------------------------- |
| **框架**   | NestJS 11        | 核心服务端框架 (TypeScript) |
| **语言**   | TypeScript 5     | 强类型开发体验              |
| **数据库** | MySQL 8          | 关系型数据库                |
| **ORM**    | TypeORM 0.3      | 数据库对象映射              |
| **缓存**   | Redis (ioredis)  | 高性能缓存存储              |
| **文档**   | Swagger          | API 接口文档生成            |
| **工具链** | ESLint, Prettier | 代码规范与格式化            |
| **包管理** | pnpm             | 高效的依赖管理              |

## 📦 快速开始

### 1. 环境准备

确保本地已安装以下环境：

- **Node.js**: >= 22.18.0
- **pnpm**: >= 10.15.0
- **MySQL**: >= 8.0
- **Redis**: >= 6.0 (可选，推荐安装)

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

复制项目根目录下的 `.env.example` (如果不存在请新建) 为 `.env` 或 `.env.development`，并根据实际环境修改：

```env
# --- 应用基础 ---
NODE_ENV=development
NEST_PORT=3000
NEST_APP_TITLE=NestJS Template
NEST_BASE_URL=http://localhost:3000

# --- 数据库 (MySQL) ---
NEST_DATABASE_HOST=localhost
NEST_DATABASE_PORT=3306
NEST_DATABASE_USER=root
NEST_DATABASE_PASSWORD=your_password
NEST_DATABASE_NAME=nestjs_app
NEST_DATABASE_SYNCHRONIZE=true
NEST_DATABASE_LOGGING=false

# --- 缓存 (Redis) ---
NEST_REDIS_ENABLED=true
NEST_REDIS_HOST=localhost
NEST_REDIS_PORT=6379
NEST_REDIS_PASSWORD=
NEST_REDIS_DB=0

# --- JWT 认证 ---
NEST_JWT_SECRET=replace_with_your_secure_secret_key
NEST_JWT_ACCESS_TOKEN_TTL=3600      # 1小时
NEST_JWT_REFRESH_TOKEN_TTL=604800   # 7天

# --- 文件上传 ---
NEST_UPLOAD_MAX_SIZE=10485760       # 10MB
NEST_STATIC_ASSETS_DIR=./static
```

### 4. 启动项目

```bash
# 开发模式 (热更新)
pnpm run start:dev

# 生产模式
pnpm run start:prod
```

启动成功后：

- **API 服务**: `http://localhost:3000/api/v1`
- **Swagger 文档**: `http://localhost:3000/api-docs`

## 🧩 核心模块说明

### 认证模块 (Auth)

位于 `src/modules/auth`。

- **Login**: `POST /auth/login` (返回 Access + Refresh Token)
- **Register**: `POST /auth/register`
- **Captcha**: `GET /auth/captcha` (SVG 格式)
- **Refresh**: `POST /auth/refresh` (换取新 Token)

### 权限模块 (RBAC)

位于 `src/modules/rbac`。

- **Decorator**: 使用 `@RequirePermissions('user:read')` 保护 Controller 方法。
- **Guard**: `PermissionsGuard` 会自动拦截并校验用户权限。
- **Bootstrap**: `RbacBootstrapService` 在应用启动时检查并创建默认角色。
- **Entities**:
  - `Role`: 支持层级结构 (Parent/Children)。
  - `Permission`: 定义具体的操作权限点。

### 用户模块 (Users)

位于 `src/modules/users`。

- 提供标准的用户 CRUD 操作。
- 与 Auth 模块解耦，通过 `userId` 关联。
- 支持批量删除、状态切换等管理功能。

## 📜 常用命令

| 命令                  | 说明                                     |
| --------------------- | ---------------------------------------- |
| `pnpm run start:dev`  | 启动开发服务器 (Watch Mode)              |
| `pnpm run build:prod` | 构建生产环境代码                         |
| `pnpm run code:check` | 运行代码检查 (Format + Lint + TypeCheck) |
| `pnpm run code:fix`   | 自动修复代码格式与 Lint 问题             |

## 📂 目录结构概览

```
src/
├── common/            # 通用基础设施 (Guards, Filters, Interceptors, Pipes)
├── config/            # 全局配置模块 (环境变量映射)
├── database/          # 数据库配置
├── modules/           # 业务功能模块
│   ├── auth/          # 认证相关
│   ├── rbac/          # 角色权限相关
│   └── users/         # 用户管理
└── shared/            # 共享服务模块
    ├── cache/         # 缓存适配层
    ├── files/         # 文件存储服务
    └── import-export/ # 数据导入导出
```

## 🤝 贡献与规范

- **Git Commit**: 请遵循 Conventional Commits 规范 (e.g., `feat: add login api`).
- **Code Style**: 提交前请运行 `pnpm run code:check` 确保代码符合 Prettier 和 ESLint 标准.

## 📄 License

UNLICENSED
