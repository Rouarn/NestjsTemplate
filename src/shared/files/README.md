# 文件上传系统 (src/shared/files)

该模块提供了一个通用的文件上传系统，支持单文件和多文件上传，具备文件类型和大小校验功能，并采用存储适配器模式，方便未来扩展不同的存储后端（如 OSS、S3 等）。

## 核心特性

- **单/多文件上传**：支持通过 `multipart/form-data` 协议上传单个或多个文件。
- **自动文件名生成**：使用 UUID 生成唯一文件名，防止重名冲突。
- **目录自动化管理**：按日期（`YYYY/MM`）自动组织存储目录，提高文件检索效率。
- **存储适配器模式**：通过 `StorageAdapter` 接口抽象存储操作，默认实现为本地文件系统存储。
- **内置校验**：提供 `FileValidationPipe` 校验文件后缀名和大小。
- **Swagger 集成**：所有接口均已集成 Swagger 文档，支持在线调试。

## 目录结构

```text
src/shared/files/
├── dto/                    # 数据传输对象 (FileUploadResponseDto)
├── interfaces/             # 接口定义 (StorageAdapter)
├── pipes/                  # 校验管道 (FileValidationPipe)
├── services/               # 业务逻辑与存储服务
│   ├── files.service.ts    # 文件处理逻辑 (重命名、路径生成)
│   └── storage.service.ts  # 本地存储实现
├── files.controller.ts     # 上传接口定义
└── files.module.ts         # 模块配置 (Multer 异步注册)
```

## 接口说明

### 1. 单文件上传

- **URL**: `POST /upload`
- **Content-Type**: `multipart/form-data`
- **参数**: `file` (Binary)
- **校验**:
  - 允许后缀: `.jpg`, `.jpeg`, `.png`, `.pdf`, `.zip`
  - 最大限制: 10MB

### 2. 多文件上传

- **URL**: `POST /upload/multiple`
- **Content-Type**: `multipart/form-data`
- **参数**: `files` (Array of Binary)
- **校验**: 继承单文件校验逻辑，且受 `app.uploadsMaxFiles` 配置限制。

### 响应示例

```json
{
  "url": "/static/2024/03/550e8400-e29b-41d4-a716-446655440000.jpg",
  "completeUrl": "http://localhost:3000/static/2024/03/550e8400-e29b-41d4-a716-446655440000.jpg"
}
```

## 配置说明

文件上传的相关限制可在 `ConfigService` 中进行配置：

- `app.uploadsMaxSize`: 单个文件的最大字节数（默认 10MB）。
- `app.uploadsMaxFiles`: 多文件上传时的最大文件数量（默认 10 个）。
- `staticAssetsOptions.root`: 本地存储的根路径。
- `staticAssetsOptions.prefix`: 静态资源访问的前缀（如 `/static`）。

## 存储扩展

若需更换存储引擎（例如阿里云 OSS），只需：

1. 实现 `StorageAdapter` 接口。
2. 在 `FilesModule` 中将 `StorageService` 替换为新的实现类，或在 `StorageService` 中注入新的驱动。
