# 异常处理模块

## 概述

- 统一的业务异常模型，标准化错误响应结构
- 覆盖常见业务异常：验证、未授权、无权限、未找到、冲突、限流
- 与全局 `HttpExceptionFilter` 协同，自动补充时间戳、路径等信息

## 导出

- `BusinessException`
- `BusinessExceptionFactory`

## 响应结构

```json
{
  "code": 400,
  "message": "请求参数不合法",
  "data": {},
  "success": false,
  "timestamp": "2025-01-01 12:00:00",
  "error": "BusinessException",
  "url": "/api/v1/users",
  "path": "/api/v1/users"
}
```

## 使用示例

```ts
import { BusinessExceptionFactory } from '@/common/exceptions';

throw BusinessExceptionFactory.invalidParameter('请求参数', { field: 'username' });
throw BusinessExceptionFactory.unauthorized('鉴权');
throw BusinessExceptionFactory.forbidden('资源访问', { resource: 'order' });
throw BusinessExceptionFactory.notFound('用户', { id: 1 });
throw BusinessExceptionFactory.conflict('资源', { id: 1 });
throw BusinessExceptionFactory.systemBusy({ message: '请求过于频繁', retryAfter: 60 });
```

## 与验证管道集成

- 全局 `CustomValidationPipe` 在验证失败时抛出 `BusinessExceptionFactory.invalidParameter`
- 过滤器统一格式化为标准错误响应
