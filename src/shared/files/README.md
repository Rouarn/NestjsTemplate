# 文件上传系统 (src/shared/files)

该模块提供通用的文件上传能力，支持单文件和多文件上传，采用磁盘流式存储与多层校验，并通过存储适配器 + DI token 抽象存储后端，方便未来扩展到 OSS、S3 等。

## 核心特性

- **单/多文件上传**：通过 `multipart/form-data` 上传，字段名分别为 `file` 与 `files`。
- **磁盘流式存储**：Multer 使用 `diskStorage` 直接写入临时文件，上传期间文件不常驻 Node 内存。
- **内容级类型校验**：基于文件内容（magic number）检测真实类型，不信任客户端声明的 mimetype 与原始文件名。
- **自动文件名生成**：UUID + 内容检测出的真实扩展名；按日期（`YYYY/MM`）组织目录。
- **临时目录隔离**：未通过校验的文件留在系统临时目录中，永远不会进入对外服务的静态资源目录。
- **存储适配器模式**：通过 `StorageAdapter` 接口与 `STORAGE_ADAPTER` token 解耦，默认实现为本地磁盘。
- **Swagger 集成**：接口均已集成 Swagger 文档，支持在线调试。

## 目录结构

```text
src/shared/files/
├── dto/                    # 数据传输对象 (FileUploadResponseDto)
├── guards/                 # 预检守卫 (FileUploadGuard)
├── interfaces/             # StorageAdapter 接口与 STORAGE_ADAPTER token
├── services/
│   ├── files.service.ts    # 内容校验、重命名、路径生成
│   └── storage.service.ts  # 本地磁盘存储实现
├── files.controller.ts     # 上传接口定义
└── files.module.ts         # 模块配置 (Multer 异步注册、适配器绑定)
```

## 上传流程

请求依次经过以下环节，非法请求会尽早被拒绝：

1. **FileUploadGuard（Guard，接收请求体之前）**
   - 校验 `Content-Type` 必须为 `multipart/form-data`。
   - 按目标接口计算总量限额并校验 `Content-Length`：单文件接口按 1 个文件计，多文件接口按 `uploadsMaxFiles` 个文件的总量计，并为每文件预留 64KB 的 multipart 协议开销。
   - 使用 chunked 编码、不带 `Content-Length` 的请求会跳过本层，最终限制仍由 Multer `limits` 强制执行。
2. **Multer fileFilter（解析 multipart 期间）**
   - 检查声明的 `mimetype` 是否在白名单内，不通过则立即中断传输。
3. **Multer diskStorage（流式落盘）**
   - 文件以 `uuid.tmp` 写入系统临时目录（`os.tmpdir()/nestjs-upload`）。
4. **FilesService（Controller 调用）**
   - 用 `file-type` 基于文件内容检测真实类型；检测失败、与声明类型不一致或不在白名单内均拒绝请求。
   - 生成 `YYYY/MM/uuid.真实扩展名` 目标路径，调用适配器将临时文件移动到静态资源目录。
   - 校验或存储失败时自动删除临时文件，避免残留。
5. **静态资源访问**
   - 文件通过配置的静态资源前缀（如 `/static`）对外提供访问。

## 接口与响应

| 接口               | 方法 | 字段名  | 说明                                        |
| ------------------ | ---- | ------- | ------------------------------------------- |
| `/upload`          | POST | `file`  | 单文件上传                                  |
| `/upload/multiple` | POST | `files` | 多文件上传（数量受 `uploadsMaxFiles` 限制） |

响应示例：

```json
{
  "url": "/static/2024/03/550e8400-e29b-41d4-a716-446655440000.jpg",
  "completeUrl": "http://localhost:3000/static/2024/03/550e8400-e29b-41d4-a716-446655440000.jpg"
}
```

## 配置说明

配置项位于环境变量（经 `AppConfigService.staticAssetsOptions` 读取）：

- `NEST_UPLOAD_MAX_SIZE`：单个文件最大字节数（默认 10MB）。
- `NEST_UPLOAD_MAX_FILES`：多文件上传的最大数量（默认 10）。
- `NEST_UPLOAD_ALLOWED_TYPES`：允许的 mimetype 白名单，逗号分隔（如 `image/jpeg,image/png,application/pdf`）；**留空表示不限制类型**。
- `NEST_STATIC_ASSETS_DIR`：本地存储根路径（相对路径基于 `process.cwd()` 解析）。
- `NEST_STATIC_ASSETS_PREFIX`：静态资源访问前缀（如 `/static`）。

## 存储扩展

更换存储引擎（例如阿里云 OSS）只需两步，业务代码无需改动：

1. 新建类实现 `StorageAdapter` 接口（`upload` / `download` / `delete` / `exists` / `getUrl`）。
2. 在 `files.module.ts` 中把绑定改为新实现：

   ```ts
   { provide: STORAGE_ADAPTER, useClass: OssStorageService }
   ```
