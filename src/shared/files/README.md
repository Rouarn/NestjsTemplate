# Files 模块

统一处理文件上传、静态存储、访问 URL 生成与文件元数据持久化。

## 核心特性

- **配置驱动白名单**：允许的文件类型由环境变量 `NEST_UPLOAD_ALLOWED_TYPES` 单点控制，代码中无任何硬编码类型清单——白名单放行的类型即可上传。
- **内容级防伪校验**：可检测的二进制格式（图片/压缩包/exe 等）要求声明类型与实际内容一致；文本类等无 magic number 的格式信任白名单，扩展名由 `mime-types` 数据库派发。
- **通用预检**：路由级 `@UploadQuota` 装饰器声明文件数配额，Guard 据此做 Content-Length 早期拦截，无路径魔法字符串。
- **接口限流**：上传接口 10 次/分钟/IP（`@nestjs/throttler`），全局兜底 100 次/分钟。
- **元数据持久化**：上传成功写入 `ra_files` 表（原始文件名、存储路径、真实 MIME、大小、上传者）。
- **失败自动回滚**：批量上传任一失败，已落盘文件与 DB 记录全部清理。
- **临时目录隔离**：Multer 先写入 `os.tmpdir()`，校验通过后才迁入静态目录。

## 目录结构

```text
files/
├── decorators/
│   ├── api-file.decorator.ts       # @ApiFile / @ApiFiles (Swagger 文档)
│   └── upload-quota.decorator.ts   # @UploadQuota (路由级文件数配额)
├── dto/                            # FileUploadResponseDto
├── entities/                       # File 元数据实体
├── guards/
│   └── file-upload.guard.ts        # Content-Type 检查 + 配额驱动的 Content-Length 预检
├── interfaces/                     # StorageAdapter 抽象 + STORAGE_ADAPTER 注入令牌
├── services/
│   ├── files.service.ts            # 类型判定、命名、落库、回滚
│   └── storage.service.ts          # 本地磁盘实现
├── files.controller.ts             # POST /upload、POST /upload/multiple
└── files.module.ts                 # Multer 配置（fileFilter/limits/diskStorage）
```

## 上传流程

```
1. ThrottlerGuard      → 限流（10 次/分钟/IP）
2. JwtAuthGuard        → 需登录（@GetCurrentUser('userId') 记录上传者）
3. FileUploadGuard     → Content-Type + Content-Length 预检（按 @UploadQuota 配额）
4. Multer fileFilter   → 声明 mimetype 是否在白名单（解析期即中断，唯一白名单校验点）
5. Multer limits       → 文件大小 / 数量的字节级限制
6. Multer diskStorage  → 流式写入临时目录
7. FilesService        → file-type 防伪校验 → 派发扩展名 → UUID 命名 → 落盘 → 写库
```

### 类型判定规则（`resolveFileType`）

| file-type 检测结果     | 处理                                                                   |
| ---------------------- | ---------------------------------------------------------------------- |
| 检测成功且 = 声明 mime | 放行，用检测出的扩展名                                                 |
| 检测成功但 ≠ 声明 mime | 400 拒绝（防伪：如 exe 改后缀冒充 png）                                |
| 检测不到（文本类等）   | 信任白名单已放行的声明 mime，用 `mime-types` 查扩展名，查不到用 `.bin` |

## 接口概览

| 方法 | 路径                   | 说明       | 字段名  | 成功响应                      |
| ---- | ---------------------- | ---------- | ------- | ----------------------------- |
| POST | `/api/upload`          | 单文件上传 | `file`  | `{ url, completeUrl }`        |
| POST | `/api/upload/multiple` | 批量上传   | `files` | `[{ url, completeUrl }, ...]` |

两接口均需认证；`url` 为相对路径，`completeUrl` 为完整访问地址（`NEST_BASE_URL` 为空时与 `url` 相同）。

## 配置说明

```bash
NEST_STATIC_ASSETS_DIR=./deploy/static       # 静态资源目录（含上传目录）
NEST_STATIC_ASSETS_PREFIX=/static            # 访问前缀（/ 开头，结尾无 /）
NEST_BASE_URL=http://localhost:8898          # 站点地址，留空则返回相对路径
NEST_UPLOAD_ALLOWED_TYPES=image/jpeg,...     # 允许的文件类型白名单（唯一事实源）
NEST_UPLOAD_MAX_SIZE=10485760                # 单文件大小上限（字节）
NEST_UPLOAD_MAX_FILES=10                     # 批量上传最大文件数
```

## 安全说明

1. **扩展名由服务端派发**：存储文件名为 `uuid.{扩展名}`，扩展名来自内容检测或 `mime-types` 数据库，绝不使用原始文件名——攻击者无法控制文件的最终服务身份（Content-Type 由扩展名决定）。
2. **安全响应头**：由全局 `helmet` 统一设置（`X-Content-Type-Options: nosniff` 禁止浏览器嗅探绕过 Content-Type、`X-Frame-Options` 等）；静态资源放行 `Cross-Origin-Resource-Policy: cross-origin` 以支持前后端分离部署。
3. **客户端必须声明准确的 Content-Type**：声明 `application/octet-stream` 但内容实为 PNG 会被防伪校验拒绝，这是刻意设计（防止通用类型绕过白名单）。
4. **白名单即信任边界**：放行 `image/svg+xml`、`text/html` 等可执行格式等于允许存储型 XSS（文件内容真实可执行，防伪校验无法拦截）。如需放行，建议将静态资源部署到独立域名做 Cookie 隔离。
5. **限流**：`@nestjs/throttler` 基于内存按 IP 计数；多实例部署需自行接入 Redis 存储（官方 `@nest-lab/throttler-storage-redis`）。

## 新增上传接口（开发者指引）

```typescript
@Post('avatar')
@UploadQuota(2)            // 或 'max' 使用 NEST_UPLOAD_MAX_FILES 配置值
@ApiFile('avatar')         // Swagger 文档，自定义字段名
@UseInterceptors(FileInterceptor('avatar'))
async uploadAvatar(@UploadedFile() file: Express.Multer.File) { ... }
```

- 在 `NEST_UPLOAD_ALLOWED_TYPES` 中加入新类型即可放行，无需改任何代码。
- 文件数配额用 `@UploadQuota(n)` 声明，未声明时 Guard 按单文件预检。

## 注意事项

- 更换存储介质：实现 `StorageAdapter` 接口并在 `FilesModule` 中绑定 `STORAGE_ADAPTER` 即可（如改为 OSS/S3，需改为流式上传以利用临时文件流）。
- 生产环境 `synchronize: false`，`ra_files` 表由 `node scripts/init-db.js --env=production` 随初始化一并创建。
- `ra_files` 表仅记录元数据，不提供删除/查询接口，按需扩展。
