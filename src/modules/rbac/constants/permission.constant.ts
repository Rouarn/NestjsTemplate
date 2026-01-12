export enum PermissionAction {
  // 用户管理
  USER_READ = 'user:read',
  USER_CREATE = 'user:create',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_UPDATE_STATUS = 'user:update:status',

  // 角色管理
  ROLE_READ = 'role:read',
  ROLE_CREATE = 'role:create',
  ROLE_UPDATE = 'role:update',
  ROLE_DELETE = 'role:delete',
  ROLE_ASSIGN_PERMISSIONS = 'role:assign-permissions',

  // 权限管理
  PERMISSION_READ = 'permission:read',
  PERMISSION_CREATE = 'permission:create',

  // 认证/系统管理
  AUTH_KICKOUT = 'auth:kickout',
  AUTH_ACTIVE_USERS = 'auth:active-users',
}

export const PERMISSION_GROUPS = {
  USER: '用户管理',
  ROLE: '角色管理',
  PERMISSION: '权限管理',
  SYSTEM: '系统管理',
};

export const DEFAULT_PERMISSIONS = [
  // 用户管理
  {
    name: PermissionAction.USER_READ,
    description: '查看用户列表和详情',
    group: PERMISSION_GROUPS.USER,
  },
  { name: PermissionAction.USER_CREATE, description: '创建新用户', group: PERMISSION_GROUPS.USER },
  {
    name: PermissionAction.USER_UPDATE,
    description: '更新用户信息',
    group: PERMISSION_GROUPS.USER,
  },
  { name: PermissionAction.USER_DELETE, description: '删除用户', group: PERMISSION_GROUPS.USER },
  {
    name: PermissionAction.USER_UPDATE_STATUS,
    description: '修改用户状态(启用/禁用)',
    group: PERMISSION_GROUPS.USER,
  },

  // 角色管理
  {
    name: PermissionAction.ROLE_READ,
    description: '查看角色列表和详情',
    group: PERMISSION_GROUPS.ROLE,
  },
  { name: PermissionAction.ROLE_CREATE, description: '创建新角色', group: PERMISSION_GROUPS.ROLE },
  {
    name: PermissionAction.ROLE_UPDATE,
    description: '更新角色信息',
    group: PERMISSION_GROUPS.ROLE,
  },
  { name: PermissionAction.ROLE_DELETE, description: '删除角色', group: PERMISSION_GROUPS.ROLE },
  {
    name: PermissionAction.ROLE_ASSIGN_PERMISSIONS,
    description: '分配权限给角色',
    group: PERMISSION_GROUPS.ROLE,
  },

  // 权限管理
  {
    name: PermissionAction.PERMISSION_READ,
    description: '查看权限列表',
    group: PERMISSION_GROUPS.PERMISSION,
  },
  {
    name: PermissionAction.PERMISSION_CREATE,
    description: '创建新权限',
    group: PERMISSION_GROUPS.PERMISSION,
  },

  // 系统管理
  {
    name: PermissionAction.AUTH_KICKOUT,
    description: '踢出在线用户',
    group: PERMISSION_GROUPS.SYSTEM,
  },
  {
    name: PermissionAction.AUTH_ACTIVE_USERS,
    description: '查看在线用户',
    group: PERMISSION_GROUPS.SYSTEM,
  },
];
