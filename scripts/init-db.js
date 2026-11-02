#!/usr/bin/env node

/**
 * 数据库初始化脚本 —— 仅用于新项目 / 新库的第一次创建
 *
 * 执行内容: 建库 → 建表(auth / users / files) → 创建初始管理员 admin
 *
 * 管理员密码优先取 NEST_INIT_ADMIN_PASSWORD；未配置时随机生成并只打印一次。
 * 脚本不会写入任何固定口令，避免默认凭据随部署包流入生产。
 *
 * 用法:
 *   node scripts/init-db.js                    默认读取 .env.development
 *   node scripts/init-db.js --env=production   读取 .env.production（线上用）
 *
 * 依赖: 仅 mysql2（项目已安装），无需其他任何包
 */

import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
// 与 validation.schema 的默认值保持一致，避免建表与实际查询的表名对不上
const prefix = process.env.NEST_DATABASE_TABLE_PREFIX ?? 'ra_';

// 建表 SQL（与 Auth / User 实体一致）
const createAuthTable = `
CREATE TABLE IF NOT EXISTS \`${prefix}auth\` (
  \`id\` VARCHAR(36) NOT NULL COMMENT '认证ID',
  \`username\` VARCHAR(100) NOT NULL COMMENT '用户名',
  \`password\` VARCHAR(255) NOT NULL COMMENT '密码（bcrypt 哈希内嵌盐值）',
  \`role\` VARCHAR(16) NOT NULL DEFAULT 'user' COMMENT '角色: admin-管理员, user-普通用户',
  \`status\` TINYINT NOT NULL DEFAULT 1 COMMENT '认证状态: 0-禁用, 1-启用',
  \`last_login_at\` DATETIME NULL DEFAULT NULL COMMENT '最后登录时间',
  \`last_login_ip\` VARCHAR(45) NULL DEFAULT NULL COMMENT '最后登录IP',
  \`login_attempts\` INT NOT NULL DEFAULT 0 COMMENT '登录失败次数',
  \`token_version\` INT NOT NULL DEFAULT 0 COMMENT '令牌版本(用于吊销)',
  \`locked_at\` DATETIME NULL DEFAULT NULL COMMENT '账户锁定时间',
  \`password_changed_at\` DATETIME NULL DEFAULT NULL COMMENT '密码最后修改时间',
  \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_auth_username\` (\`username\`),
  KEY \`idx_auth_created_at\` (\`created_at\`)
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
  \`email\` VARCHAR(128) NULL DEFAULT NULL COMMENT '邮箱地址（唯一）',
  \`birthday\` DATE NULL DEFAULT NULL COMMENT '生日',
  \`city\` VARCHAR(100) NULL DEFAULT NULL COMMENT '所在城市',
  \`profession\` VARCHAR(100) NULL DEFAULT NULL COMMENT '职业',
  \`auth_id\` VARCHAR(36) NULL DEFAULT NULL COMMENT '关联认证ID',
  \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_users_auth_id\` (\`auth_id\`),
  UNIQUE KEY \`uk_users_email\` (\`email\`),
  UNIQUE KEY \`uk_users_mobile\` (\`mobile\`),
  KEY \`idx_users_created_at\` (\`created_at\`),
  CONSTRAINT \`fk_users_auth_id\` FOREIGN KEY (\`auth_id\`) REFERENCES \`${prefix}auth\` (\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户信息表';
`;

const createFilesTable = `
CREATE TABLE IF NOT EXISTS \`${prefix}files\` (
  \`id\` VARCHAR(36) NOT NULL COMMENT '文件ID',
  \`original_name\` VARCHAR(255) NOT NULL COMMENT '原始文件名',
  \`stored_path\` VARCHAR(512) NOT NULL COMMENT '存储相对路径',
  \`mime_type\` VARCHAR(128) NOT NULL COMMENT '文件真实MIME类型',
  \`size\` INT UNSIGNED NOT NULL COMMENT '文件大小(字节)',
  \`uploader_id\` VARCHAR(36) NULL DEFAULT NULL COMMENT '上传者用户ID',
  \`created_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  \`updated_at\` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`uk_files_stored_path\` (\`stored_path\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文件元数据表';
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

    await connection.query(createFilesTable);
    console.log(`✓ 表 ${prefix}files 已创建`);

    // 3. 创建初始管理员
    //    密码来源：NEST_INIT_ADMIN_PASSWORD（推荐，供自动化部署注入）
    //    缺省时随机生成 12 字节（base64url 16 字符）并只打印一次
    const providedPassword = process.env.NEST_INIT_ADMIN_PASSWORD?.trim();
    const initialPassword = providedPassword || crypto.randomBytes(12).toString('base64url');
    const passwordHash = await bcrypt.hash(initialPassword, 12);

    const [adminInsertResult] = await connection.execute(
      `INSERT INTO \`${prefix}auth\` (
        \`id\`, \`username\`, \`password\`, \`role\`, \`status\`,
        \`login_attempts\`, \`password_changed_at\`, \`created_at\`, \`updated_at\`
      )
      SELECT UUID(), 'admin', ?, 'admin',
        1, 0, NOW(6), NOW(6), NOW(6)
      WHERE NOT EXISTS (SELECT 1 FROM \`${prefix}auth\` WHERE \`username\` = 'admin');`,
      [passwordHash],
    );

    await connection.query(
      `INSERT INTO \`${prefix}users\` (\`id\`, \`auth_id\`, \`nickname\`, \`gender\`, \`created_at\`, \`updated_at\`)
      SELECT UUID(), \`a\`.\`id\`, '管理员', 2, NOW(6), NOW(6)
      FROM \`${prefix}auth\` AS \`a\`
      WHERE \`a\`.\`username\` = 'admin'
        AND NOT EXISTS (SELECT 1 FROM \`${prefix}users\` AS \`u\` WHERE \`u\`.\`auth_id\` = \`a\`.\`id\`);`,
    );
    if (adminInsertResult.affectedRows > 0) {
      console.log('✓ 管理员账号已创建: admin');
      if (providedPassword) {
        console.log('  初始密码: 取自 NEST_INIT_ADMIN_PASSWORD');
      } else {
        console.log(`  初始密码（仅本次显示，请立即登录并修改）: ${initialPassword}`);
      }
    } else {
      console.log('• 管理员账号已存在，跳过创建（如需重置请手工处理）');
    }

    console.log('数据库初始化完成');
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('初始化失败:', error.message);
  process.exit(1);
});
