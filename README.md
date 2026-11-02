# NestJS Template

基于 NestJS 12 + TypeORM + MySQL 构建的后端 API 模板，内置 JWT 双令牌（含吊销）、统一响应信封、
最小 RBAC、文件上传防护、结构化日志与 OpenAPI 自动生成，可与 [frontend-template](https://github.com/Rouarn/frontend-template) 配套使用。

> 模板定位：**开箱即用的项目骨架**，不追求功能大而全。所有能力都有明确边界，
> 删除比保留更容易 —— 不需要的模块直接删掉即可，不存在隐藏耦合。

## 技术栈

| 分类 | 技术                           | 说明                                      |
| ---- | ------------------------------ | ----------------------------------------- |
| 框架 | NestJS 12 + TypeScript 6       | 模块化、纯 ESM（相对导入，产物自包含）    |
| 数据 | MySQL 8 + TypeORM              | 关系型数据库，开发期可自动同步表结构      |
| 认证 | @nestjs/jwt + bcryptjs         | 访问/刷新双令牌、`ver` 版本吊销           |
| 文档 | @nestjs/swagger                | OpenAPI 3 文档（CLI 插件自动生成 Schema） |
| 日志 | nest-winston + winston         | 单行 JSON、按日轮转、敏感字段脱敏         |
| 校验 | class-validator + joi          | DTO 校验 + 环境变量校验（唯一事实源）     |
| 安全 | helmet + @nestjs/throttler     | 安全响应头、分级限流、上传类型拒绝名单    |
| 规范 | ESLint + Prettier + Husky + CI | 提交前检查 + GitHub Actions 质量门禁      |

## 环境要求

- Node.js >= 22.18.0（见 `.nvmrc`）
- pnpm >= 10.15.0（`packageManager` 已锁定版本，建议启用 corepack）
- MySQL >= 8.0

## 快速开始

```bash
git clone https://github.com/Rouarn/nestjs-template.git
cd nestjs-template

pnpm install
cp .env.example .env     # 必填项缺失或格式错误会直接启动失败
```

**只有两个 JWT 密钥是必填项**，其余配置都有默认值（见 `validation.schema.ts`），
`.env` 可以只写需要覆盖的项：

```env
# 必填：两个密钥都必须 >= 32 字符且互不相同
NEST_JWT_SECRET=<32+ 字符随机串>
NEST_JWT_REFRESH_SECRET=<另一个 32+ 字符随机串>

# 常用覆盖项（不写则使用默认值）
NEST_PORT=8848
NEST_BASE_URL=http://localhost:8848
NEST_DATABASE_HOST=127.0.0.1
NEST_DATABASE_USER=root
NEST_DATABASE_PASSWORD=<你的密码>
NEST_DATABASE_NAME=nestjs_template

# 本机直连填 0；部署在 Nginx / 负载均衡之后填 1（否则限流与登录 IP 会失真）
NEST_TRUST_PROXY=0

# 开发期运行时目录（默认值，放在 deploy/ 下保持根目录干净）
NEST_STATIC_ASSETS_DIR=./deploy/static
NEST_LOGGER_DIR=./deploy/logs
```

生成密钥：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

初始化数据库并启动：

```bash
pnpm run db:init     # 建库、建表、创建初始管理员（密码随机生成并打印一次）
pnpm run start:dev   # 开发模式（watch）
```

启动后：

- **API 入口**：`http://localhost:8848/api`
- **健康检查**：`http://localhost:8848/api/health`（数据库不可用时返回 503）
- **Swagger UI**：`http://localhost:8848/api-docs`（仅非生产环境）
- **OpenAPI JSON**：`http://localhost:8848/static/api-docs.json`（文件写入 `deploy/static/`）

> `db:init` 不会写入任何固定口令：密码取 `NEST_INIT_ADMIN_PASSWORD`，
> 未配置时随机生成并**只打印一次**。

## 常用命令

| 命令                  | 说明                                                   |
| --------------------- | ------------------------------------------------------ |
| `pnpm run start:dev`  | 开发模式（watch）                                      |
| `pnpm run start:prod` | 运行 `deploy/dist` 构建产物                            |
| `pnpm run build`      | 编译到 `deploy/dist`（相对导入，产物自包含）           |
| `pnpm run code:check` | 格式 + Lint + 类型检查（CI 同款）                      |
| `pnpm run code:fix`   | 自动修复格式与 Lint                                    |
| `pnpm run db:init`    | 建库建表 + 初始管理员                                  |
| `pnpm run g:res`      | 资源脚手架（module/controller/service/dto/entity）     |
| `pnpm run deploy`     | 生成部署包 `deploy/`（编译 + 启动脚本 + 生产依赖清单） |

## 项目结构

```
src/
├── common/              # 通用基础设施
│   ├── constants/       # 响应/分页/认证常量
│   ├── decorators/      # @Public / @Roles / @GetCurrentUser
│   ├── enums/           # 性别、状态、角色
│   ├── exceptions/      # BusinessException
│   ├── filters/         # 全局异常过滤器（含唯一键冲突 → 409）
│   ├── guards/          # JwtAuthGuard / RolesGuard / SelfOrAdminGuard
│   ├── helpers/         # 启动日志、日志脱敏
│   ├── interceptors/    # 响应信封、访问日志
│   ├── interfaces/      # 响应/请求/当前用户类型
│   ├── middleware/      # requestId 与耗时上下文
│   └── pipes/           # 统一校验管道
├── config/              # 配置（Joi 校验是唯一事实源）
├── database/            # TypeORM 连接与基础实体
├── modules/
│   ├── auth/            # 登录 / 注册 / 验证码 / 令牌刷新 / 改密
│   └── users/           # 用户资料 CRUD（受 RBAC 保护）
├── shared/
│   ├── auth-token/      # 令牌版本（吊销）服务
│   ├── files/           # 上传、存储、文件元数据
│   └── logger/          # winston 配置
└── utils/               # 仅保留实际使用的工具（时间、枚举）

deploy/                  # 构建与运行时目录（已 gitignore）
├── dist/                # nest build 产物
├── logs/                # 运行日志（NEST_LOGGER_DIR 默认 ./deploy/logs）
└── static/              # 上传文件 + api-docs.json（NEST_STATIC_ASSETS_DIR 默认 ./deploy/static）
```

> 开发期把 `dist` / `logs` / `static` 都放在 `deploy/` 下，仓库根目录保持干净；
> `pnpm run deploy` 会清空并重建整个 `deploy/`，并把配置里的 `./deploy/xxx` 归一化为包内相对的 `./xxx`。

## 接口规范

### 统一响应信封

成功响应（`code` 与 HTTP 状态行一致，POST 成功即 201）：

```json
{
  "code": 200,
  "message": "请求成功",
  "success": true,
  "timestamp": "2026-11-02T00:00:00.000Z",
  "data": {}
}
```

失败响应（由全局过滤器产出，HTTP 状态与 `code` 一致）：

```json
{
  "code": 400,
  "message": "请求参数不合法",
  "success": false,
  "timestamp": "2026-11-02T00:00:00.000Z",
  "url": "http://localhost:8848/api/auth/login",
  "data": {
    "validationErrors": [{ "field": "username", "messages": ["用户名长度必须在3-20个字符之间"] }]
  }
}
```

约定：

- 信封 `message` 固定为「请求成功」，**业务提示放在 `data` 内**（例如注册接口返回 `data.message = '注册成功'`）；
- `data` 直接是 Controller 的返回值，拦截器不做任何字段嗅探或拆包；
- 唯一键冲突由过滤器统一映射为 `409 数据已存在，请检查唯一字段`。

### 分页

分页由 Service 显式返回 `PaginatedData`，不再根据请求参数猜测：

```json
{
  "records": [],
  "total": 100,
  "totalPages": 10,
  "current": 1,
  "size": 10
}
```

查询参数为 `current` + `size`（`size` 上限 100），模糊搜索会转义 `%` / `_`。

## 权限模型

- 角色：`admin` / `user`，随访问令牌的 `role` 声明下发，由 `@Roles()` + `RolesGuard` 校验
- 用户列表、启用/禁用、删除、批量删除：**仅管理员**
- 用户详情、更新资料：管理员可操作任意用户，普通用户仅限本人（`SelfOrAdminGuard`）
- 管理员不能删除自己
- 角色以数据库为准：每次请求按令牌版本缓存（默认 30 秒）刷新，改角色无需等令牌过期

## 认证体系

### 双令牌

| 令牌    | 默认有效期 | 声明                        | 用途                   |
| ------- | ---------- | --------------------------- | ---------------------- |
| access  | 1 小时     | `typ=access`、`role`、`ver` | 接口鉴权               |
| refresh | 7 天       | `typ=refresh`、`ver`、`jti` | 仅用于 `/auth/refresh` |

- 两类令牌使用**不同密钥**，且校验时强制检查 `typ`：刷新令牌不能当访问令牌用，反之亦然
- `ver` 是令牌版本：改密、禁用、改角色时 +1，旧令牌在下一次校验即失效（受缓存 TTL 影响）
- 刷新令牌每次换取都会签发新的一对，旧 refresh 在版本变更后自动不可用

### 安全策略

- **验证码**：服务端 HMAC 签名，载荷只含 `nonce/过期时间/答案 HMAC`，客户端无法离线穷举；
  5 分钟有效，登录/注册强制校验（无状态实现，同一令牌在有效期内可重复使用）
- **密码**：bcrypt（默认 12 轮），异步哈希，不阻塞事件循环
- **防爆破**：失败次数指数退避锁定；登录失败统一返回 `401 用户名或密码错误`（不区分用户不存在/密码错/锁定/禁用）
- **限流**：全局 100 次/分钟；登录 5 次/分钟、验证码 10 次/分钟、刷新 10 次/分钟、上传 10 次/分钟
- **CORS**：`NEST_CORS_ORIGINS` 必须显式配置域名，`*` 会导致启动失败（与 credentials 冲突）

## 文件上传

- 白名单：`NEST_UPLOAD_ALLOWED_TYPES`（默认 `image/jpeg,image/png,image/gif,image/webp,application/pdf`）
- 拒绝名单：HTML / SVG / JS / XML 等可执行类型**永久拒绝**（`files.constants.ts`），与白名单无关
- 内容校验：`file-type` 探测 magic number，声明与实际不符直接拒绝；扩展名由服务端派发
- 存储：先落 `os.tmpdir()`，校验通过后迁入 `NEST_STATIC_ASSETS_DIR`，批量失败自动回滚
- 静态资源：上传目录长缓存（30 天 immutable），`api-docs.json` 强制 `no-cache`

## 日志与可观测

- 每个请求**一条**结构化日志（`requestId / method / path / status / durationMs / ip / userId`），
  成功与失败分别由拦截器和过滤器输出，不再逐行打印边框
- `X-Request-Id` 支持上游透传（校验字符与长度），并在响应头回写
- 请求/响应体默认**不记录**；`NEST_LOG_BODY=true` 时记录，但仍会脱敏
  （password / token / secret / authorization / cookie / captcha 等键）
- 文件日志：`app-*.log`（全量）+ `error-*.log`（错误），按日轮转并压缩

## 常见问题

### 请求返回 404？

接口启用了 API 版本控制，默认通过请求头 `X-Api-Version: 1` 指定版本
（`NEST_API_VERSIONING_TYPE=uri` 时改为 `/api/v1/...`）。

### 改了实体但表结构没变？

开发环境需 `NEST_DATABASE_SYNCHRONIZE=true`；生产环境强制关闭，请使用迁移脚本。

### 改完密码后被踢下线？

这是预期行为：改密会递增令牌版本，所有旧令牌（含当前会话）立即失效，需要用新密码重新登录。

### 启动报环境变量校验失败？

配置项与默认值只在 `src/config/validation.schema.ts` 中定义，
`.env.example` 是所有必填项的完整清单，缺失或格式错误会直接启动失败。

### 部署后限流异常、登录 IP 全是 127.0.0.1？

把 `NEST_TRUST_PROXY` 设为反向代理层数（通常 1），应用才会信任 `X-Forwarded-*`。

### 提交被钩子拦截？

提交信息需符合 Conventional Commits；代码需通过 Prettier / ESLint / `tsc --noEmit`。
先运行 `pnpm run code:fix` 再提交。CI 会跑同样的 `code:check` 与构建。

## 与前端联动

前端 `pnpm gen:api` 会拉取 `/static/api-docs.json` 生成类型。修改实体或 DTO 后：

1. 启动本服务（Swagger 插件自动生成 Schema）
2. 前端执行 `pnpm gen:api`

> 实体 nullable 列需显式标注 `string | null` / `Date | null`，联合类型字段必须为 `@Column` 显式声明 `type`。

## 许可

仅限团队内部使用（UNLICENSED），未授予外部使用、修改或分发权利。

## 作者

**Rouarn** — <woyuxiaji@foxmail.com> · [GitHub](https://github.com/Rouarn) · [shixian.xyz](http://www.shixian.xyz)
