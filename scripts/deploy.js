#!/usr/bin/env node

/**
 * 部署包构建脚本
 *
 * 构建与运行时目录统一放在 deploy/ 下，仓库根目录保持干净：
 *   deploy/
 *   ├── dist/             编译产物（nest build 直接输出到这里）
 *   ├── logs/ static/     开发期运行时目录（打包时会被清空重建）
 *   ├── scripts/          init-db.js
 *   ├── package.json      生产依赖清单
 *   ├── .env              归一化后的生产配置
 *   ├── start-*.sh|bat    启动脚本
 *   └── install-*.sh|bat  依赖安装脚本
 *
 * 打包会先清空 deploy/，因此不会带入旧产物；同时会把环境变量里的
 * `./deploy/xxx` 归一化为包内相对路径（`./xxx`），并强制 NODE_ENV=production。
 */
import { execSync } from 'node:child_process';
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleError, log, separator, showBanner, showSuccess } from './utils/log.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const deployPath = path.join(projectRoot, 'deploy');
const distPath = path.join(deployPath, 'dist');

/**
 * 把开发期 env 归一化为「部署包内」可用的配置
 *
 * - 强制 `NODE_ENV=production`（启动脚本也会设置，双保险）；
 * - `./deploy/static`、`./deploy/logs` → `./static`、`./logs`
 *   （部署包以自身目录为 cwd，不能再多一层 deploy）。
 *
 * @param {string} raw 原始 env 文本
 * @returns {string} 归一化后的 env 文本
 */
function normalizeEnvForPackage(raw) {
  const lines = raw.split(/\r?\n/);
  const output = [];
  let hasNodeEnv = false;

  for (const line of lines) {
    const matched = /^(\s*)([A-Z0-9_]+)\s*=(.*)$/.exec(line);
    if (!matched) {
      output.push(line);
      continue;
    }

    const [, indent, key, rawValue] = matched;
    if (key === 'NODE_ENV') {
      output.push(`${indent}NODE_ENV=production`);
      hasNodeEnv = true;
      continue;
    }

    output.push(`${indent}${key}=${rawValue.replace(/^(["']?)\.\/deploy\//, '$1./')}`);
  }

  if (!hasNodeEnv) output.unshift('NODE_ENV=production');
  return output.join('\n');
}

try {
  showBanner('NestJS 部署打包');
  log(`项目根目录: ${projectRoot}`, 'info');
  log(`部署目录: ${deployPath}`, 'info');
  separator();

  // 1. 清空 deploy（旧产物、旧日志、旧上传文件都不会进入新包）
  if (existsSync(deployPath)) {
    log('清理旧的 deploy 目录', 'clean');
    rmSync(deployPath, { recursive: true, force: true });
  }
  mkdirSync(deployPath, { recursive: true });

  // 2. 生产构建（tsconfig 的 outDir 即 deploy/dist）
  log('执行生产构建 (nest build)', 'build');
  execSync('npx nest build', {
    cwd: projectRoot,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' },
  });

  if (!existsSync(path.join(distPath, 'main.js'))) {
    throw new Error('构建失败：deploy/dist/main.js 不存在');
  }

  // 3. 生成生产用 package.json（只保留运行时依赖，无 imports 映射）
  const sourcePkg = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
  const productionPkg = {
    name: sourcePkg.name,
    version: sourcePkg.version,
    description: sourcePkg.description,
    author: sourcePkg.author,
    private: true,
    license: sourcePkg.license,
    type: 'module',
    scripts: {
      start: 'node dist/main.js',
      'db:init': 'node scripts/init-db.js --env=production',
    },
    dependencies: sourcePkg.dependencies,
    engines: { node: sourcePkg.engines?.node ?? '>=22.18.0' },
  };
  writeFileSync(
    path.join(deployPath, 'package.json'),
    `${JSON.stringify(productionPkg, null, 2)}\n`,
  );
  log('已生成 deploy/package.json', 'build');

  // 4. 环境配置：优先 .env.production，其次 .env；只保留一份，避免多文件优先级歧义
  const envSource = ['.env.production', '.env']
    .map((file) => path.join(projectRoot, file))
    .find((file) => existsSync(file));

  if (envSource) {
    const normalized = normalizeEnvForPackage(readFileSync(envSource, 'utf8'));
    writeFileSync(path.join(deployPath, '.env'), normalized);
    log(`已生成 deploy/.env（来源 ${path.basename(envSource)}，已归一化路径与 NODE_ENV）`, 'copy');
  } else {
    log('未找到 .env / .env.production，部署包内需手工创建 .env', 'warning');
  }

  // 5. 数据库初始化脚本
  mkdirSync(path.join(deployPath, 'scripts'), { recursive: true });
  cpSync(
    path.join(projectRoot, 'scripts', 'init-db.js'),
    path.join(deployPath, 'scripts', 'init-db.js'),
  );
  log('已拷贝 scripts/init-db.js', 'copy');

  // 6. 启动脚本（显式设置 NODE_ENV=production）
  const startLinux = `#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
export NODE_ENV=production
node dist/main.js
`;
  const startLinuxPath = path.join(deployPath, 'start-linux.sh');
  writeFileSync(startLinuxPath, startLinux);
  chmodSync(startLinuxPath, 0o755);

  const startWindows = `@echo off
cd /d %~dp0
set NODE_ENV=production
node dist/main.js
pause
`;
  writeFileSync(path.join(deployPath, 'start-windows.bat'), startWindows);

  const startBtPanel = `#!/usr/bin/env node
// 宝塔面板 / PM2 启动入口：显式使用生产环境
process.env.NODE_ENV = 'production';
await import('./dist/main.js');
`;
  const startBtPath = path.join(deployPath, 'start-app-BT.js');
  writeFileSync(startBtPath, startBtPanel);
  chmodSync(startBtPath, 0o755);
  log('已生成启动脚本: start-linux.sh / start-windows.bat / start-app-BT.js', 'deploy');

  // 7. 依赖安装脚本（生产依赖）
  const installLinux = `#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
npm install --omit=dev
`;
  const installLinuxPath = path.join(deployPath, 'install-linux.sh');
  writeFileSync(installLinuxPath, installLinux);
  chmodSync(installLinuxPath, 0o755);

  const installWindows = `@echo off
cd /d %~dp0
npm install --omit=dev
pause
`;
  writeFileSync(path.join(deployPath, 'install-windows.bat'), installWindows);
  log('已生成安装脚本: install-linux.sh / install-windows.bat', 'deploy');

  // 8. 部署说明
  const readme = `# 部署说明

## 目录内容

- \`dist/\`：编译产物（相对导入，可独立运行，勿改）
- \`scripts/init-db.js\`：建库建表 + 创建初始管理员
- \`.env\`：生产配置（已归一化路径与 NODE_ENV；**上线前务必替换密钥与数据库口令**）
- \`logs/\`、\`static/\`：运行时自动创建（日志、上传文件、Swagger JSON）
- \`start-linux.sh\` / \`start-windows.bat\` / \`start-app-BT.js\`：启动脚本
- \`install-linux.sh\` / \`install-windows.bat\`：安装生产依赖

## 首次部署

1. 修改 \`.env\`（至少替换 \`NEST_JWT_SECRET\`、\`NEST_JWT_REFRESH_SECRET\`、数据库口令）
2. 安装依赖：\`./install-linux.sh\`
3. 初始化数据库：\`NODE_ENV=production node scripts/init-db.js\`
   - 初始管理员密码取 \`NEST_INIT_ADMIN_PASSWORD\`，未配置时随机生成并打印一次
4. 启动：\`./start-linux.sh\`

## 注意

- 生产环境 \`NEST_DATABASE_SYNCHRONIZE\` 强制为 \`false\`（应用内已按环境强制）
- \`NEST_CORS_ORIGINS\` 不允许使用 \`*\`
- 反向代理场景请把 \`NEST_TRUST_PROXY\` 设为代理层数（通常 1），否则限流与登录 IP 会失真
- 健康检查：\`GET /api/health\`（数据库不可用时返回 503）
- \`logs/\`、\`static/\` 位于部署包内，重新打包会被清空；如需保留请改为挂载目录或外部路径
`;
  writeFileSync(path.join(deployPath, 'README.md'), readme);

  separator();
  showSuccess(`部署包已生成: ${deployPath}`);
  log('下一步：将 deploy/ 上传到服务器，按 README.md 执行', 'info');
} catch (error) {
  handleError('部署打包失败', error);
}
