# 异常处理模块

## 概述

- 统一的业务异常模型，标准化错误响应结构
- message-first 静态工厂：第一参数即最终响应文案，方法名绑定 HTTP 状态码
- 覆盖常见业务异常：参数错误 (400)、未授权 (401)、无权限 (403)、不存在 (404)、冲突 (409)、限流 (429)
- 与全局 `AllExceptionsFilter` 协同，自动补充时间戳、路径等信息

## 导出

- `BusinessException`
- `BusinessExceptionDetails`（错误上下文类型）

## 响应结构

```json
{
  "code": 400,
  "message": "请求参数不合法",
  "data": {},
  "success": false,
  "timestamp": "2025-01-01T12:00:00.000Z",
  "url": "/api/v1/users",
  "path": "/api/v1/users"
}
```

## 使用示例

```ts
import { BusinessException } from '@/common/exceptions';

// 静态工厂：第一参数为完整文案（可省略，省略时使用默认文案），第二参数为可选的错误上下文
throw BusinessException.badRequest('旧密码错误', { username: 'tom' });
throw BusinessException.unauthorized('未提供认证令牌');
throw BusinessException.forbidden('访问被禁用', { disabled: true });
throw BusinessException.notFound('用户不存在', { id: 1 });
throw BusinessException.conflict('邮箱已被使用', { email: 'a@b.c' });
throw BusinessException.tooManyRequests('请求过于频繁', { retryAfter: 60 });

// 其他状态码直接构造兜底（status 默认 400）
throw new BusinessException('需要付费', HttpStatus.PAYMENT_REQUIRED);
```

## 与验证管道集成

- 全局 `CustomValidationPipe` 在验证失败时抛出 `BusinessException.badRequest('请求参数不合法', { validationErrors })`
- `validationErrors` 为 `{ field, messages }[]` 结构（`field` 支持 `address.city`、`items[0].name` 形式的嵌套路径），错误文案由各 DTO 装饰器的 `message` 声明
- 过滤器统一格式化为标准错误响应
