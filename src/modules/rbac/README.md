# RBAC 权限管理模块

`RBAC` (Role-Based Access Control) 模块为系统提供了基于角色的访问控制能力。通过灵活的角色和权限配置，可以实现精细化的权限管理。

## 核心功能

- **角色管理**：支持角色的创建、更新、删除及层级继承（父子角色）。
- **权限管理**：支持细粒度权限的定义（如 `user:create`）。
- **动态分配**：
  - 为角色分配权限（多对多）。
  - 为用户分配角色（多对多）。
- **缓存支持**：内置 Redis 缓存支持，高性能权限验证。
- **租户隔离**：数据模型预留 `tenant_id`，支持多租户扩展。

## API 接口文档

所有接口均位于 `/rbac` 路径下，需携带 JWT Token 访问。

### 角色管理

- `POST /rbac/roles` - 创建新角色
- `GET /rbac/roles` - 获取角色列表
- `PUT /rbac/roles/:id` - 更新角色信息
- `DELETE /rbac/roles/:id` - 删除角色
- `POST /rbac/roles/:id/permissions` - 为角色分配权限

### 权限管理

- `POST /rbac/permissions` - 创建新权限
- `GET /rbac/permissions` - 获取权限列表

### 用户授权

- `POST /rbac/users/:id/roles` - 为用户分配角色

## 装饰器使用指南

在 Controller 中使用装饰器来控制访问权限。

### 1. 角色检查 (`@RequireRoles`)

检查当前用户是否拥有指定角色之一。

```typescript
import { RequireRoles } from '@/modules/rbac/decorators/roles.decorator';
import { RolesGuard } from '@/modules/rbac/guards/roles.guard';

@UseGuards(RolesGuard)
@RequireRoles('admin', 'editor')
@Get('admin-data')
getAdminData() {
  // 只有 admin 或 editor 角色可以访问
}
```

### 2. 权限检查 (`@RequirePermissions`)

检查当前用户是否拥有指定权限（通过角色间接拥有）。

```typescript
import { RequirePermissions } from '@/modules/rbac/decorators/permissions.decorator';
import { PermissionsGuard } from '@/modules/rbac/guards/permissions.guard';

@UseGuards(PermissionsGuard)
@RequirePermissions('user:create')
@Post('users')
createUser() {
  // 只有拥有 user:create 权限的用户可以访问
}
```

> **注意**：通常建议在全局或 Controller 级别组合使用 `JwtAuthGuard`, `RolesGuard`, `PermissionsGuard`。

## 数据模型

### Role (角色)

- `id`: UUID
- `name`: 唯一标识 (e.g. `admin`)
- `alias`: 显示名称 (e.g. `管理员`)
- `parent`: 父级角色 (支持继承)

### Permission (权限)

- `id`: UUID
- `name`: 权限标识 (e.g. `article:edit`)
- `group`: 权限分组

## 系统预置角色

在 `src/modules/rbac/constants/system-roles.constant.ts` 中定义了系统预置角色：

- `ADMIN` (admin): 超级管理员 (站长)
- `EDITOR` (editor): 内容管理员
- `USER` (user): 普通用户
- `GUEST` (guest): 访客

## 系统初始化 (Bootstrap)

模块内置了 `RbacBootstrapService`，在应用启动时会自动检查并修复系统核心数据：

1. **角色初始化**：自动创建上述系统预置角色（如果不存在）。
2. **超级管理员权限兜底**：
   - 每次启动时，会自动检查 `ADMIN` 角色是否拥有系统内 **所有** 权限。
   - 如果发现权限缺失，会自动补全，确保站长永远拥有最高权限。
3. **默认权限分配**：
   - `EDITOR` 角色会根据预设逻辑（如 `user:read` 等）自动获得基础权限。
   - 可以在 `RbacBootstrapService` 中调整这些默认策略。
