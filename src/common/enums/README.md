# 枚举与常量 (Enums & Constants)

本项目统一使用 TS Enum 来管理状态、类型与固定选项，并配合工具函数实现类型安全与便捷调用。

## 性别枚举（`gender.enum.ts`）

- 枚举：`Gender`（`UNKNOWN=0`, `MALE=1`, `FEMALE=2`）
- 常量与类型：
  - `GENDER_VALUES`: `[0, 1, 2]`
  - `GenderType`: `0 | 1 | 2`
  - `GENDER_LABELS`: `{'0': '未知', '1': '男', '2': '女'}`
  - `GENDER_EN_LABELS`: `{'0': 'Unknown', '1': 'Male', '2': 'Female'}`
- 工具函数：
  - `isValidGender(value): value is Gender`
  - `getGenderLabel(gender): string`
  - `getGenderKey(gender): keyof typeof Gender`
  - `parseGender(genderStr): Gender`（支持英文/中文/别名）
  - `getGenderOptions(): { value, label, key }[]`

## 状态枚举（`status.enum.ts`）

- 枚举：`Status`（`DISABLED=0`, `ENABLED=1`）
- 常量与类型：
  - `STATUS_VALUES`: 所有枚举数值列表
  - `StatusType`: 类型别名
  - `STATUS_LABELS`: 显示标签映射（禁用/启用）
  - `STATUS_KEYS`: 键名映射（DISABLED/ENABLED）
  - `STATUS_DESCRIPTIONS`: 状态描述文案
- 工具函数：
  - `isValidStatus(value): value is Status`
  - `getStatusLabel(status): string`
  - `getStatusKey(status): keyof typeof Status`
  - `getStatusDescription(status): string`
  - `parseStatus(statusStr): Status`（支持键名/数字/标签）
  - `getStatusOptions(): { value, label, key, description }[]`
  - `toggleStatus(status): Status`（启用↔禁用）
  - `isEnabled(status): boolean` / `isDisabled(status): boolean`

## 角色枚举（`role.enum.ts`）

- 枚举：`Role`（字符串枚举，如 `admin`、`editor`、`user` 等）
- 配置与分组：
  - `ROLE_HIERARCHY`: 权限等级（数值越大权限越高）
  - `ROLE_CONFIG`: 显示信息（`label/description/color/icon`）
  - `ROLE_GROUPS`: 角色分组（`ADMIN/BUSINESS/READONLY`）
- 工具类：`RoleUtils`
  - 校验与显示：`isValidRole`、`getRoleLabel`、`getRoleDescription`、`getRoleConfig`
  - 权限等级与比较：`getRoleLevel`、`compareRoles`、`canManageRole`
  - 归属与分组：`isAdminRole`、`isBusinessRole`、`isReadOnlyRole`、`getRoleGroup`
  - 上下级关系：`getManageableRoles`（可管理的下级）、`getSuperiorRoles`（上级）
  - 解析与选项：`parseRole`、`getRoleOptions`（列表）、`getGroupedRoleOptions`（分组）
  - 权限判断：`hasPermission(userRole, requiredRole)`、`getPermissionScope`
- 便捷导出：
  - 直接导出常用函数以兼容旧代码（如 `getRoleLabel` 等）
  - 默认导出：`export default Role`

## 最佳实践

- 统一从 `@/common/enums` 导入，避免到处引用具体文件路径。
- 业务层不要硬编码魔法值，使用枚举与工具函数保证类型安全与可读性。
- 表单/下拉框使用 `get*Options()` 生成选项，实现展示与值的统一来源。
- 权限判断统一走 `RoleUtils`，避免在业务代码中散落数字比较或字符串判断。
- 对外接口或存储时，优先保存枚举值（数字或字符串），显示层使用工具函数渲染标签。

## 代码片段示例

```ts
import {
  Role,
  RoleUtils,
  Status,
  getStatusOptions,
  Gender,
  getGenderOptions,
} from '@/common/enums';

// 生成表单选项
const genderOptions = getGenderOptions();
const statusOptions = getStatusOptions();
const roleOptions = RoleUtils.getRoleOptions();

// 权限控制
const canEdit = RoleUtils.hasPermission(Role.ADMIN, Role.USER);
const manageable = RoleUtils.getManageableRoles(Role.EDITOR); // 下级角色列表

// 状态切换
const nextStatus = toggleStatus(Status.ENABLED);

// 参数解析
const role = RoleUtils.parseRole('admin') ?? Role.USER;
const gender = parseGender('男');
const status = parseStatus('ENABLED');
```

## 目录结构

```
src/common/enums/
  ├─ gender.enum.ts   # 性别枚举与工具
  ├─ role.enum.ts     # 角色枚举、层级、分组与工具类
  ├─ status.enum.ts   # 状态枚举与工具
  └─ index.ts         # 集中导出入口
```

---

如需增加新的枚举类型，建议参考现有文件的结构与工具函数设计，保持统一的使用体验与类型签名。

## 开发指南

- 推荐使用 `EnumHelper` (`@/utils/helpers/enum.helper`) 来简化枚举工具函数的实现。
- `EnumHelper` 提供了 `getValues`, `hasValue`, `getKeyByValue`, `toOptions` 等通用方法，可直接替代大部分手动实现的样板代码。
