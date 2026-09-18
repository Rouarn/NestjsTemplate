# NestJS Template

基于 NestJS 11 构建的精简后端 API 模板，聚焦「统一接口规范 + 日志记录 + 基础认证」，提供开箱即用、二次开发友好的开发基础。

## 🚀 核心特性

- **模块化架构**: 清晰的领域分层，核心模块 (Auth, Users, Files) 职责分离。
- **基础认证系统 (Auth)**:
  - **JWT 双令牌**: Access Token (短效) + Refresh Token (长效，自校验 JWT，无需服务端存储)。
  - **安全防护**: 集成 SVG 验证码 (Captcha)，bcrypt 密码加密，登录失败锁定策略（指数退避）。
  - **核心流程**: 登录、注册、注销、修改密码、刷新令牌。
- **文件服务 (Files)**:
  - **本地存储适配**: 封装统一的存储接口，支持文件上传、下载与流式传输。
  - **严格校验**: 可配置的文件类型 (MIME) 与大小限制。
  - **元数据管理**: 完整记录文件信息（原名、大小、MIME、存储路径）至数据库。
- **健壮的基础设施**:
  - **统一配置**: 基于 `AppConfigService` 的强类型配置管理。
  - **数据库**: TypeORM + MySQL 8，支持自动迁移与实体同步。
  - **标准化响应**: 统一的 API 响应格式 (Interceptors) 与全局异常处理 (Filters)。
  - **请求追踪**: 全局 `requestId` 链路，请求入口/出口结构化日志。
  - **API 文档**: 集成 Swagger (OpenAPI 3)，自动生成接口文档。

> 💡 本模板有意省略了 RBAC 权限体系与缓存层，以保持骨架精简；如需缓存，按需引入 `ioredis` 即可。

## 🛠 技术栈

| 类别       | 技术选型         | 说明                        |
| ---------- | ---------------- | --------------------------- |
| **框架**   | NestJS 11        | 核心服务端框架 (TypeScript) |
| **语言**   | TypeScript 5     | 强类型开发体验              |
| **数据库** | MySQL 8          | 关系型数据库                |
| **ORM**    | TypeORM          | 数据库对象映射              |
| **文档**   | Swagger          | API 接口文档生成            |
| **工具链** | ESLint, Prettier | 代码规范与格式化            |
| **包管理** | pnpm             | 高效的依赖管理              |

## 📦 快速开始

### 1. 环境准备

确保本地已安装以下环境：

- **Node.js**: >= 22.18.0
- **pnpm**: >= 10.15.0
- **MySQL**: >= 8.0

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

# --- JWT 认证 ---
NEST_JWT_SECRET=replace_with_your_secure_secret_key
NEST_JWT_ACCESS_TOKEN_TTL=3600      # 1小时
NEST_JWT_REFRESH_TOKEN_TTL=604800   # 7天

# --- 文件上传 ---
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
- **Logout**: `POST /auth/logout`
- **Change Password**: `PUT /auth/change-password`

> 接口受全局 `JwtAuthGuard` 保护，公开接口使用 `@Public()` 装饰器标记。

### 用户模块 (Users)

位于 `src/modules/users`。

- 提供标准的用户 CRUD 操作。
- 与 Auth 模块解耦，通过 `auth` 一对一关联。
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
│   └── users/         # 用户管理
└── shared/            # 共享服务模块
    ├── files/         # 文件存储服务
    └── logger/        # 日志服务
```

## 🤝 贡献与规范

- **Git Commit**: 请遵循 Conventional Commits 规范 (e.g., `feat: add login api`).
- **Code Style**: 提交前请运行 `pnpm run code:check` 确保代码符合 Prettier 和 ESLint 标准.

## 📄 License

UNLICENSED
