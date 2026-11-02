/**
 * 应用根服务
 *
 * 只负责读取构建期固化的 `package.json` 元信息，供 `/version`、`/info` 使用。
 */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** package.json 中本服务关心的字段 */
interface PackageJson {
  name: string;
  version: string;
  description?: string;
  author?: string;
  license?: string;
}

/**
 * package.json 的候选路径（按顺序取第一个存在的）
 *
 * 构建产物位于 `deploy/dist/`：
 * - 开发期 cwd 是仓库根目录 → 命中根 package.json；
 * - 部署包内 cwd 是部署目录 → 命中部署包 package.json；
 * - 进程 cwd 被 PM2 等改成别处时，回退到模块相对路径（`deploy/package.json` / 根 package.json）。
 */
const PACKAGE_JSON_CANDIDATES = [
  join(process.cwd(), 'package.json'),
  fileURLToPath(new URL('../../package.json', import.meta.url)),
  fileURLToPath(new URL('../package.json', import.meta.url)),
];

/** 解析实际使用的 package.json 路径 */
function resolvePackageJsonPath(): string {
  const found = PACKAGE_JSON_CANDIDATES.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(`未找到 package.json，已尝试: ${PACKAGE_JSON_CANDIDATES.join(', ')}`);
  }
  return found;
}

@Injectable()
export class AppService implements OnModuleInit {
  private packageJson!: PackageJson;

  onModuleInit(): void {
    const packageJsonPath = resolvePackageJsonPath();

    try {
      this.packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as PackageJson;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`读取 package.json 失败（${packageJsonPath}）: ${reason}`);
    }
  }

  getHello(): { message: string; timestamp: string; version: string } {
    return {
      message: `Hello ${this.packageJson.name} v${this.packageJson.version}`,
      timestamp: new Date().toISOString(),
      version: this.packageJson.version,
    };
  }

  getAppInfo(): {
    name: string;
    version: string;
    description?: string;
    author?: string;
    license?: string;
    uptime: number;
  } {
    return {
      name: this.packageJson.name,
      version: this.packageJson.version,
      description: this.packageJson.description,
      author: this.packageJson.author,
      license: this.packageJson.license,
      uptime: process.uptime(),
    };
  }
}
