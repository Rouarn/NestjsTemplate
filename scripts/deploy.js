#!/usr/bin/env node

import { handleError, log, separator, showBanner, showSuccess } from '@vakao-ui/scripts-utils';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 部署脚本 - 准备生产环境部署文件
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const distPath = path.join(projectRoot, 'dist');
const deployPath = path.join(projectRoot, 'deploy');

function sleep(ms) {
  try {
    const sab = new SharedArrayBuffer(4);
    const ia = new Int32Array(sab);
    Atomics.wait(ia, 0, 0, ms);
  } catch (_) {
    const end = Date.now() + ms;
    while (Date.now() < end) {}
  }
}

function removeDirRobust(targetPath, maxRetries = 5) {
  if (!fs.existsSync(targetPath)) return;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      fs.rmSync(targetPath, { recursive: true, force: true });
      if (!fs.existsSync(targetPath)) return;
    } catch (err) {
      // 尝试解锁只读/占用文件并逐个清理
      try {
        const entries = fs.readdirSync(targetPath, { withFileTypes: true });
        for (const entry of entries) {
          const p = path.join(targetPath, entry.name);
          try {
            fs.chmodSync(p, 0o666);
          } catch (_) {}
          try {
            if (entry.isDirectory()) {
              removeDirRobust(p, 0);
            } else {
              fs.unlinkSync(p);
            }
          } catch (_) {}
        }
      } catch (_) {}
      if (attempt === maxRetries) throw err;
      sleep(200 * (attempt + 1));
    }
  }
}

try {
  showBanner('NestJS 部署工具');
  log('开始准备部署文件...', 'deploy');
  separator('─', 50);

  // 检查 dist 目录是否存在
  if (!fs.existsSync(distPath)) {
    throw new Error('dist 目录不存在，请先运行 npm run build:prod');
  }

  // 创建部署目录
  if (fs.existsSync(deployPath)) {
    log('清理旧的部署目录...', 'clean');
    removeDirRobust(deployPath);
  }

  fs.mkdirSync(deployPath, { recursive: true });
  log(`创建部署目录: ${deployPath}`, 'deploy');

  // 移动 dist 目录
  log('移动 dist 目录...', 'move');
  fs.renameSync(distPath, path.join(deployPath, 'dist'));

  // 动态生成生产环境 package.json
  log('生成生产环境 package.json...', 'build');
  const originalPackageJson = JSON.parse(
    fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'),
  );

  // 创建生产环境 package.json
  const productionPackageJson = {
    name: originalPackageJson.name,
    version: originalPackageJson.version,
    description: originalPackageJson.description,
    author: originalPackageJson.author,
    private: originalPackageJson.private,
    license: originalPackageJson.license,
    type: originalPackageJson.type,
    imports: originalPackageJson.imports,
    scripts: {
      start: 'cross-env NODE_ENV=production node dist/main.js',
      'start:simple': 'node dist/main.js',
    },
    dependencies: {
      // 从原始 package.json 复制所有生产依赖
      ...originalPackageJson.dependencies,
      // 确保包含一些可能在 devDependencies 中但生产环境需要的包
      ...(originalPackageJson.devDependencies?.cors && {
        cors: originalPackageJson.devDependencies.cors,
      }),
      ...(originalPackageJson.devDependencies?.['cross-env'] && {
        'cross-env': originalPackageJson.devDependencies['cross-env'],
      }),
      ...(originalPackageJson.devDependencies?.['@nestjs/swagger'] && {
        '@nestjs/swagger': originalPackageJson.devDependencies['@nestjs/swagger'],
      }),
    },
    engines: originalPackageJson.engines,
  };

  // 写入生产环境 package.json
  const deployPackageJson = path.join(deployPath, 'package.json');
  fs.writeFileSync(deployPackageJson, JSON.stringify(productionPackageJson, null, 2));

  // 复制环境配置文件
  const envFiles = ['.env.production', '.env'];
  for (const envFile of envFiles) {
    const srcEnv = path.join(projectRoot, envFile);
    const destEnv = path.join(deployPath, envFile);

    if (fs.existsSync(srcEnv)) {
      log(`复制环境文件: ${envFile}`, 'copy');
      fs.copyFileSync(srcEnv, destEnv);
    }
  }

  // 创建启动脚本 (Windows)
  const startScriptWin = `@echo off
echo NestJS Application Is Being Started...
set NODE_ENV=production
node dist/main.js
pause
`;

  const startWinFilename = 'start-windows.bat';
  fs.writeFileSync(path.join(deployPath, startWinFilename), startScriptWin);
  log(`创建Windows启动脚本: ${startWinFilename}`, 'deploy');

  // 创建启动脚本 (Linux)
  const startScriptLinux = `#!/bin/bash
echo "正在启动 NestJS 应用..."
export NODE_ENV=production
node dist/main.js
`;

  const startLinuxFilename = 'start-linux.sh';
  fs.writeFileSync(path.join(deployPath, startLinuxFilename), startScriptLinux);
  fs.chmodSync(path.join(deployPath, startLinuxFilename), '755');
  log(`创建Linux启动脚本: ${startLinuxFilename}`, 'deploy');

  // 创建宝塔面板专用启动文件
  const btPanelStartScript = `#!/usr/bin/env node

// 宝塔面板专用启动文件
// 设置生产环境变量
process.env.NODE_ENV = 'production';

// 启动应用
console.log('正在启动 NestJS 应用...');
await import('./dist/main.js');
`;

  // 写入宝塔面板专用启动文件
  const startBtPanelFilename = 'start-app-BT.js';
  fs.writeFileSync(path.join(deployPath, startBtPanelFilename), btPanelStartScript);
  fs.chmodSync(path.join(deployPath, startBtPanelFilename), '755');
  log(`创建宝塔面板启动文件: ${startBtPanelFilename}`, 'deploy');

  // 创建安装依赖脚本 (Windows)
  const installScriptWin = `@echo off
echo Production Dependencies Are Being Installed...
npm install --omit=dev
echo Production Dependencies Installation Completed!
pause
`;

  const installWinFilename = 'install-windows.bat';
  fs.writeFileSync(path.join(deployPath, installWinFilename), installScriptWin);
  log(`创建Windows安装脚本: ${installWinFilename}`, 'deploy');

  // 创建安装依赖脚本 (Linux)
  const installScriptLinux = `#!/bin/bash
echo "正在安装生产依赖..."
npm install --omit=dev
echo "依赖安装完成！"
`;

  const installLinuxFilename = 'install-linux.sh';
  fs.writeFileSync(path.join(deployPath, installLinuxFilename), installScriptLinux);
  fs.chmodSync(path.join(deployPath, installLinuxFilename), '755');
  log(`创建Linux安装脚本: ${installLinuxFilename}`, 'deploy');

  // 创建部署说明文件
  const deployReadme = `# NestJS 应用部署指南

这是一个 NestJS 应用的完整部署包，包含了在不同环境下部署所需的所有文件和脚本。

## 📦 部署包内容

- **应用文件**: 编译后的 NestJS 应用代码
- **配置文件**: .env.production 环境配置
- **启动脚本**: 适用于不同平台的启动脚本
- **依赖文件**: package.json 和 package-lock.json

## 🚀 快速部署

### Windows 服务器

1. **安装依赖**
   \`\`\`
   双击运行 install-windows.bat
   \`\`\`
   或在命令行中执行：
   \`\`\`
   npm install --omit=dev
   \`\`\`

2. **启动应用**
   \`\`\`
   双击运行 start-windows.bat
   \`\`\`
   或在命令行中执行：
   \`\`\`
   set NODE_ENV=production && node dist/main.js
   \`\`\`

### Linux 服务器

1. **安装依赖**
   \`\`\`bash
   chmod +x install-linux.sh
   ./install-linux.sh
   \`\`\`

2. **启动应用**
   \`\`\`bash
   chmod +x start-linux.sh
   ./start-linux.sh
   \`\`\`

### 宝塔面板部署

#### 方式一：Node.js 项目管理（推荐）

1. 登录宝塔面板，进入「软件商店」→「运行环境」
2. 安装「Node.js 版本管理器」
3. 进入「网站」→「Node项目」→「添加Node项目」
4. 配置项目信息：
   - **项目路径**: 选择部署目录
   - **启动文件**: app.js
   - **端口**: 8848（或其他可用端口）
   - **项目名称**: 自定义名称
5. 点击「提交」创建项目
6. 在项目列表中点击「启动」

#### 方式二：使用 PM2 管理

1. **安装 PM2**
   \`\`\`bash
   npm install -g pm2
   \`\`\`

2. **启动应用**
   \`\`\`bash
   pm2 start app.js --name nestjs-app
   \`\`\`

3. **设置开机自启**
   \`\`\`bash
   pm2 startup
   pm2 save
   \`\`\`

4. **常用 PM2 命令**
   \`\`\`bash
   pm2 list          # 查看应用列表
   pm2 logs          # 查看日志
   pm2 restart all   # 重启所有应用
   pm2 stop all      # 停止所有应用
   \`\`\`

## ⚙️ 配置说明

### 端口配置

- **默认端口**: 8848
- **修改端口**: 编辑 .env.production 文件中的 PORT 变量
- **防火墙**: 确保已开放相应端口

### 环境变量

应用会自动加载 .env.production 文件中的环境变量，主要配置项：

\`\`\`env
# 应用端口
PORT=8848

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=your_username
DB_PASSWORD=your_password
DB_DATABASE=your_database

# JWT 配置
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d

# 其他配置...
\`\`\`

## 🔧 系统要求

### 基础环境
- **Node.js**: >= 22.18.0
- **npm**: >= 8.0.0
- **操作系统**: Windows 10+, Linux (Ubuntu 18.04+, CentOS 7+)

### 硬件要求
- **内存**: 最少 512MB，推荐 1GB+
- **磁盘**: 最少 100MB 可用空间
- **网络**: 稳定的网络连接

## 🐛 故障排除

### 常见问题及解决方案

#### 1. 端口被占用
**现象**: 启动时提示端口已被使用

**解决方案**:
\`\`\`bash
# Windows 查看端口占用
netstat -ano | findstr :8848

# Linux 查看端口占用
lsof -i :8848

# 修改端口或停止占用进程
\`\`\`

#### 2. 依赖安装失败
**现象**: npm install 报错

**解决方案**:
\`\`\`bash
# 清除缓存
npm cache clean --force

# 使用国内镜像
npm config set registry https://registry.npmmirror.com

# 重新安装
npm install --omit=dev
\`\`\`

#### 3. 环境变量未生效
**现象**: 应用无法读取配置

**解决方案**:
- 检查 .env.production 文件是否存在
- 确认 NODE_ENV 设置为 production
- 验证环境变量格式是否正确

#### 4. 权限问题 (Linux)
**现象**: 脚本无法执行

**解决方案**:
\`\`\`bash
# 添加执行权限
chmod +x *.sh

# 检查文件所有者
ls -la
\`\`\`

#### 5. 数据库连接失败
**现象**: 应用启动后无法连接数据库

**解决方案**:
- 检查数据库服务是否启动
- 验证连接配置是否正确
- 确认数据库用户权限
- 检查防火墙设置

### 日志查看

\`\`\`bash
# 应用日志
tail -f logs/application.log

# PM2 日志
pm2 logs nestjs-app

# 系统日志 (Linux)
journalctl -u your-service-name
\`\`\`

## 📈 性能优化

### 生产环境最佳实践

1. **环境配置**
   - 确保 NODE_ENV=production
   - 启用 gzip 压缩
   - 配置适当的缓存策略

2. **进程管理**
   - 使用 PM2 进行进程管理
   - 配置集群模式提高性能
   - 设置内存和 CPU 限制

3. **监控和日志**
   - 配置日志轮转
   - 设置性能监控
   - 配置错误报警

## 🔒 安全建议

1. **网络安全**
   - 配置防火墙规则
   - 使用 HTTPS
   - 限制不必要的端口访问

2. **应用安全**
   - 定期更新依赖包
   - 使用强密码和密钥
   - 启用请求限制和验证

3. **系统安全**
   - 定期更新系统补丁
   - 配置适当的用户权限
   - 启用日志审计

## 📞 技术支持

如果在部署过程中遇到问题，请按以下步骤排查：

1. ✅ 检查 Node.js 版本是否符合要求
2. ✅ 确认所有依赖已正确安装
3. ✅ 验证环境变量配置
4. ✅ 检查端口占用情况
5. ✅ 确认防火墙设置
6. ✅ 查看应用日志

如问题仍未解决，请联系开发团队并提供：
- 错误日志
- 系统环境信息
- 部署步骤记录

---

**部署成功后，您的 NestJS 应用将在指定端口运行，可通过浏览器访问应用接口。**
`;

  fs.writeFileSync(path.join(deployPath, 'README.md'), deployReadme);
  log('创建部署说明: README.md', 'deploy');

  separator('─', 50);
  showSuccess('部署文件准备完成！');
  log(`部署目录: ${deployPath}`, 'info');
  log('接下来的步骤:', 'check');
  log('1. 将 deploy 目录上传到服务器', 'check');
  log('2. 在服务器运行: npm install --production', 'check');
  log('3. 配置环境变量并启动应用', 'check');
  separator('═', 50);
} catch (err) {
  handleError('部署脚本执行失败', err);
}
