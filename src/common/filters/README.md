# 异常过滤

## 概述

- 全局异常兜底过滤：`AllExceptionsFilter` 统一错误响应
- `HttpException`（含 `BusinessException`）：按异常自带状态码与信息格式化
- 其他未知异常：返回 500 固定文案，完整错误与堆栈只写入日志，不泄露给客户端
- 结构化错误日志带 `requestId`，与请求日志链路关联

## 导出

- `AllExceptionsFilter`

## 默认注册（AppModule）

```ts
providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }];
```

## 注意：不要手动实例化注册

```ts
// ❌ 禁止：绕过依赖注入，Winston Logger 不会注入，
// 记录日志时会抛出运行时错误
app.useGlobalFilters(new AllExceptionsFilter());
```

本过滤器构造函数注入了 `WINSTON_MODULE_PROVIDER`，必须通过 Nest 依赖注入容器创建
（`APP_FILTER + useClass`，或确有需要时 `app.useGlobalFilters(app.get(AllExceptionsFilter))`）。

## 错误响应格式

- 统一 `code/message/data/success/timestamp/url/path`
- 未知异常固定返回 `code: 500`、`message: 服务器内部错误`，`data` 为空对象
