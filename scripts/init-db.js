#!/usr/bin/env node

/**
 * 数据库初始化脚本 —— 仅用于新项目 / 新库的第一次创建
 *
 * 执行内容: 建库 → 建表(ra_auth / ra_users) → 创建管理员 admin
 *
 * 用法:
 *   node scripts/init-db.js                    默认读取 .env.development
 *   node scripts/init-db.js --env=production   读取 .env.production（线上用）
 *
 * 依赖: 仅 mysql2（项目已安装），无需其他任何包
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

// 解析参数
const nodeEnv =
  process.argv.find((arg) => arg.startsWith('--env='))?.split('=')[1] ??
  process.env.NODE_ENV ??
  'development';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// 读取环境变量: .env.xxx 优先，.env 兜底，已存在的不覆盖
for (const file of [`.env.${nodeEnv}`, '.env']) {
  const filePath = path.join(root, file);
  if (!fs.existsSync(filePath)) continue;

  for (const rawLine of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const index = line.indexOf('=');
    if (index === -1) continue;

    const key = line.slice(0, index).trim();
    const value = line
      .slice(index + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

const dbName = process.env.NEST_DATABASE_NAME ?? 'nestjs_app';
const prefix = process.env.NEST_DATABASE_TABLE_PREFIX ?? '';

// 建表 SQL（与 Auth / User 实体一致）
const createAuthTable = `
CREATE TABLE IF NOT EXISTS \`${prefix}auth\` (
  \`id\` VARCHAR(36) NOT NULL COMMENT '认证ID',
  \`username\` VARCHAR(100) NOT NULL COMMENT '用户名',
  \`password\` VARCHAR(255) NOT NULL COMMENT '密码',
  \`salt\` VARCHAR(100) NULL DEFAULT NULL COMMENT '盐',
  \`status\` TINYINT NOT NULL DEFAULT 1 COMMENT '认证状态: 0-禁用, 1-启用',
  \`last_login_at\` DATETIME NULL DEFAULT NULL COMMENT '最后登录时间',
  \`last_login_ip\` VARCHAR(45) NULL DEFAULT NULL COMMENT '最后登录IP',
  \`login_attempts\` INT NOT NULL DEFAULT 0 COMMENT '登录失败次数',
  \`locked_at\` DATETIME NULL DEFAULT NULL COMMENT '账户锁定时间',
  \`password_changed_at\` DATETIME NULL DEFAULT NULL COMMENT '密码最后修改时间',
  \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  \`deleted_at\` DATETIME(6) NULL DEFAULT NULL COMMENT '软删除时间',
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_auth_username\` (\`username\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='认证信息表';
`;

const createUsersTable = `
CREATE TABLE IF NOT EXISTS \`${prefix}users\` (
  \`id\` VARCHAR(36) NOT NULL COMMENT '用户ID',
  \`nickname\` VARCHAR(64) NULL DEFAULT '用户' COMMENT '昵称',
  \`avatar\` VARCHAR(255) NULL DEFAULT NULL COMMENT '头像URL',
  \`gender\` TINYINT NULL DEFAULT 2 COMMENT '性别: 0-男, 1-女, 2-未知',
  \`mobile\` CHAR(11) NULL DEFAULT NULL COMMENT '手机号',
  \`bio\` TEXT NULL COMMENT '个人简介',
  \`email\` VARCHAR(128) NULL DEFAULT NULL COMMENT '邮箱地址',
  \`birthday\` DATE NULL DEFAULT NULL COMMENT '生日',
  \`city\` VARCHAR(100) NULL DEFAULT NULL COMMENT '所在城市',
  \`profession\` VARCHAR(100) NULL DEFAULT NULL COMMENT '职业',
  \`auth_id\` VARCHAR(36) NULL DEFAULT NULL COMMENT '关联认证ID',
  \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  \`deleted_at\` DATETIME(6) NULL DEFAULT NULL COMMENT '软删除时间',
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_users_auth_id\` (\`auth_id\`),
  CONSTRAINT \`fk_users_auth_id\` FOREIGN KEY (\`auth_id\`) REFERENCES \`${prefix}auth\` (\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户信息表';
`;

async function main() {
  // 先连 MySQL 服务器（不指定库），库不存在也能创建
  const connection = await mysql.createConnection({
    host: process.env.NEST_DATABASE_HOST ?? 'localhost',
    port: Number(process.env.NEST_DATABASE_PORT ?? 3306),
    user: process.env.NEST_DATABASE_USER ?? 'root',
    password: process.env.NEST_DATABASE_PASSWORD ?? '',
  });

  try {
    console.log(`[${nodeEnv}] 开始初始化，目标库: ${dbName}`);

    // 1. 建库
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
    );
    console.log('✓ 数据库已就绪');

    await connection.query(`USE \`${dbName}\`;`);

    // 2. 建表（先 auth 后 users，外键依赖）
    await connection.query(createAuthTable);
    console.log(`✓ 表 ${prefix}auth 已创建`);

    await connection.query(createUsersTable);
    console.log(`✓ 表 ${prefix}users 已创建`);

    // 3. 创建管理员（admin / admin123，bcrypt 10 轮）
    await connection.query(
      `INSERT INTO \`${prefix}auth\` (
        \`id\`, \`username\`, \`password\`, \`salt\`, \`status\`,
        \`login_attempts\`, \`password_changed_at\`, \`created_at\`, \`updated_at\`
      )
      SELECT UUID(), 'admin',
        '$2b$10$5jPsludKmPaISSFhWUOvhuZ5aR2XgJWE6FIq55ZUcgagChyTVYL8u',
        '$2b$10$5jPsludKmPaISSFhWUOvhu',
        1, 0, NOW(6), NOW(6), NOW(6)
      WHERE NOT EXISTS (SELECT 1 FROM \`${prefix}auth\` WHERE \`username\` = 'admin');`,
    );

    await connection.query(
      `INSERT INTO \`${prefix}users\` (\`id\`, \`auth_id\`, \`nickname\`, \`gender\`, \`created_at\`, \`updated_at\`)
      SELECT UUID(), \`a\`.\`id\`, '管理员', 2, NOW(6), NOW(6)
      FROM \`${prefix}auth\` AS \`a\`
      WHERE \`a\`.\`username\` = 'admin'
        AND NOT EXISTS (SELECT 1 FROM \`${prefix}users\` AS \`u\` WHERE \`u\`.\`auth_id\` = \`a\`.\`id\`);`,
    );
    console.log('✓ 管理员账号已创建: admin / admin123（登录后请立即改密）');

    console.log('数据库初始化完成');
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('初始化失败:', error.message);
  process.exit(1);
});
