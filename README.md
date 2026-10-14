# NestJS Template

基于 NestJS 12 + TypeORM + MySQL 构建的后端 API 模板，内置 JWT 双令牌认证、统一响应规范、Swagger 文档自动生成等工程化能力，可与 [frontend-template](https://github.com/Rouarn/frontend-template) 配套使用。

> **内部项目说明**：本模板仅限团队内部使用，未对外发布许可。开发依赖中的 `@vakao-ui/scripts-utils` 为团队私有包，需配置团队 npm 源后方可安装。

## 技术栈

| 分类 | 技术                       | 说明                                   |
| ---- | -------------------------- | -------------------------------------- |
| 框架 | NestJS 12 + TypeScript 6   | 模块化服务端框架，完整类型安全         |
| 数据 | MySQL 8 + TypeORM          | 关系型数据库 + ORM，开发期结构自动同步 |
| 认证 | @nestjs/jwt + bcryptjs     | JWT 双令牌 + 密码哈希                  |
| 文档 | @nestjs/swagger            | OpenAPI 3 文档自动生成（CLI 插件）     |
| 日志 | nest-winston + winston     | 结构化日志，按日轮转文件               |
| 校验 | class-validator + joi      | DTO 校验 + 环境变量校验                |
| 安全 | helmet + @nestjs/throttler | 安全响应头 + 接口限流                  |
| 规范 | ESLint + Prettier + Husky  | lint / 格式化 / 提交检查               |
| 工具 | pnpm                       | 依赖管理                               |

## 快速开始

```bash
git clone https://github.com/Rouarn/nestjs-template.git
cd nestjs-template

# 前提：Node.js >= 22.18.0、pnpm >= 10.15.0、MySQL >= 8.0，
# 且已配置团队 npm 源（私有依赖 @vakao-ui/scripts-utils 需要）
pnpm install
```

### 配置环境变量

参考根目录 [.env.development](.env.development) 按需调整（`.env` 兜底）：

```env
# --- 应用基础 ---
NEST_PORT=8898
NEST_APP_TITLE=NestJS Template

# --- 数据库 (MySQL) ---
NEST_DATABASE_HOST=localhost
NEST_DATABASE_PORT=3306
NEST_DATABASE_USER=root
NEST_DATABASE_PASSWORD=your_password
NEST_DATABASE_NAME=nestjs_app
NEST_DATABASE_SYNCHRONIZE=true

# --- JWT 认证（生产环境务必更换） ---
NEST_JWT_SECRET=replace_with_your_secure_secret_key
NEST_JWT_ACCESS_TOKEN_TTL=3600
NEST_JWT_REFRESH_TOKEN_TTL=604800
```

> `NEST_DATABASE_SYNCHRONIZE=true` 时实体结构变更自动同步到表，生产环境强制关闭。

### 初始化数据库并启动

```bash
pnpm run db:init        # 自动建库、建表并创建管理员 admin / admin123
pnpm run start:dev      # 开发模式（Watch）
```

启动成功后：

- **API 服务**：`http://localhost:8898/api`
- **Swagger UI**：`http://localhost:8898/api-docs`（仅非生产环境开放）
- **JSON 文档**：`http://localhost:8898/static/api-docs.json`

### 常用命令

| 命令                  | 说明                                                             |
| --------------------- | ---------------------------------------------------------------- |
| `pnpm run start:dev`  | 启动开发服务器（Watch Mode）                                     |
| `pnpm run start:prod` | 启动生产构建产物                                                 |
| `pnpm run build:prod` | 构建生产版本                                                     |
| `pnpm run code:check` | 代码检查（Format + Lint + TypeCheck）                            |
| `pnpm run code:fix`   | 自动修复格式与 Lint 问题                                         |
| `pnpm run g:res`      | 资源脚手架（生成模块骨架：module/controller/service/dto/entity） |
| `pnpm run db:init`    | 初始化数据库（建库建表 + 管理员账号）                            |
| `pnpm run deploy`     | 生产部署打包（先 code:fix 再 deploy:build）                      |

> 说明：lint、格式化、暂存区检查由 ESLint + Prettier + lint-staged 承担；git hooks 由 Husky 管理（`pnpm install` 时 prepare 脚本自动启用），提交信息经 commitlint 按 Conventional Commits 校验。

## 项目结构

```
src/
├── common/              # 通用基础设施（Guards / Filters / Interceptors / Pipes）
├── config/              # 全局配置模块（环境变量映射）
├── database/            # 数据库连接配置
├── modules/             # 业务功能模块
│   ├── auth/            # 认证（验证码 / 登录注册 / 令牌刷新 / 改密）
│   └── users/           # 用户管理（CRUD / 分页 / 状态切换）
└── shared/              # 共享服务
    ├── files/           # 文件存储服务（上传 / 下载 / 元数据）
    └── logger/          # 日志服务
scripts/                 # 工程脚本（建库初始化 / 资源脚手架 / 部署打包）
static/                  # 静态资源（Swagger JSON 文档、上传文件目录）
```

## 接口规范

### 统一响应信封

所有接口经全局 `ResponseInterceptor` 包装为统一结构，业务代码只需返回裸数据：

```json
{
  "code": 200,
  "message": "ok",
  "timestamp": "2026-10-15T00:00:00.000Z",
  "data": {}
}
```

异常经全局 `ExceptionFilter` 转换为同一信封（`code` 为业务错误码），前端 [HTTP 客户端](https://github.com/Rouarn/frontend-template) 按 `code === 200` 判定成功并解包 `data`。

### 分页响应

分页接口由拦截器将 service 返回的 `{ list, total }` 中间形态统一转换为：

```json
{
  "records": [],
  "total": 100,
  "totalPages": 10,
  "current": 1,
  "size": 10
}
```

分页参数为 `current`（页码）+ `size`（每页数量）；DTO 文档标注以实际响应结构为准。

### 请求追踪与日志

- 全局注入 `requestId` 链路标识，请求入口/出口输出结构化日志
- 日志按日轮转写入文件，开发环境同步控制台输出

## API 一览

| 模块 | 端点                        | 方法   | 说明                                |
| ---- | --------------------------- | ------ | ----------------------------------- |
| 系统 | `/api`                      | GET    | 服务健康检查                        |
| 系统 | `/api/version` `/api/info`  | GET    | 版本与服务信息                      |
| 认证 | `/api/auth/captcha`         | GET    | SVG 验证码（HMAC 签名，5 分钟有效） |
| 认证 | `/api/auth/captcha/verify`  | POST   | 验证码独立预校验                    |
| 认证 | `/api/auth/register`        | POST   | 注册（需验证码）                    |
| 认证 | `/api/auth/login`           | POST   | 登录（需验证码，返回双令牌）        |
| 认证 | `/api/auth/refresh`         | POST   | 刷新令牌                            |
| 认证 | `/api/auth/getUserInfo`     | GET    | 当前登录用户信息                    |
| 认证 | `/api/auth/change-password` | PUT    | 修改密码                            |
| 认证 | `/api/auth/logout`          | POST   | 注销                                |
| 用户 | `/api/users`                | GET    | 用户分页列表                        |
| 用户 | `/api/users`                | POST   | 创建用户                            |
| 用户 | `/api/users/{id}`           | GET    | 用户详情                            |
| 用户 | `/api/users/{id}`           | PATCH  | 更新用户                            |
| 用户 | `/api/users/{id}`           | DELETE | 删除用户（事务联动删除认证记录）    |
| 用户 | `/api/users/{id}/status`    | PATCH  | 切换启用/禁用状态                   |
| 用户 | `/api/users/batch-delete`   | POST   | 批量删除                            |
| 文件 | `/api/upload`               | POST   | 单文件上传                          |
| 文件 | `/api/upload/multiple`      | POST   | 多文件上传                          |

完整参数与 Schema 见 Swagger UI；接口默认受全局 `JwtAuthGuard` 保护，公开接口以 `@Public()` 装饰器标记。

### 与前端模板联动

前端模板的 `pnpm gen:api` 会拉取本服务 `/static/api-docs.json` 自动生成 TypeScript 类型（`OpenAPI.*`），实现契约同步。修改实体或 DTO 后：

1. 启动本服务（Swagger CLI 插件自动生成 Schema）
2. 前端执行 `pnpm gen:api`，类型自动更新

> 实体 nullable 列需显式标注 `string | null` / `Date | null`，否则 Swagger CLI 插件按 TS 类型推断为必填，导致前端可选性失真；联合类型字段必须为 `@Column` 声明显式 `type`（TypeORM 反射不支持联合类型）。

## 认证体系

### JWT 双令牌

- **Access Token**（短效，默认 1h）：接口鉴权
- **Refresh Token**（长效，默认 7d）：自校验 JWT，换取新令牌，无需服务端存储

### 安全策略

- **SVG 验证码**：服务端 HMAC 签名，5 分钟有效，登录/注册强制校验
- **密码加密**：bcrypt 哈希（内嵌盐值）
- **防爆破**：登录失败指数退避锁定
- **无状态限制**：验证码无法防同一令牌有效期内重复使用，如需「一次性消费」自行引入 Redis

> 本模板有意省略 RBAC 权限体系与缓存层以保持骨架精简；如需缓存，按需引入 `ioredis` 即可。

## 常见问题

### 请求为什么返回 404？

接口启用了 API 版本控制，默认通过请求头 `X-Api-Version: 1` 指定版本（配置项 `NEST_API_VERSIONING_TYPE`，改为 `uri` 则路径形如 `/api/v1`）。前端 HTTP 客户端已内置该请求头。

### 实体字段改了但表结构没变？

开发环境需 `NEST_DATABASE_SYNCHRONIZE=true`；生产环境强制关闭，结构变更请使用迁移脚本。

### 如何新增一个业务模块？

运行 `pnpm run g:res <name>` 生成模块骨架（module / controller / service / dto / entity），再按业务补充逻辑。

### 提交被钩子拦截？

提交信息需符合 Conventional Commits（`type: 描述`），代码需通过 Prettier / ESLint / `tsc --noEmit` 检查；先运行 `pnpm run code:fix` 修复后再提交。

### 清理测试文件

`pnpm run clean:tests` 递归删除项目中所有 `.spec.ts` 测试文件（模板不包含测试运行器，按需清理脚手架残留）。

## 参与贡献

1. 创建特性分支 (`git checkout -b feature/xxx`)
2. 提交更改（遵循 Conventional Commits，commit-msg 钩子会校验格式）
3. 推送并开启 Pull Request

## 许可

仅限团队内部使用（UNLICENSED），未授予外部使用、修改或分发权利。

## 作者

**Rouarn** — <woyuxiaji@foxmail.com> · [GitHub](https://github.com/Rouarn) · [shixian.xyz](http://www.shixian.xyz)
