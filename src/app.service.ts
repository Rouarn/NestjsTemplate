/**
 * 应用根服务
 *
 * 功能说明:
 * - 提供应用级别的基础服务
 * - 处理通用的业务逻辑
 *
 * 特点:
 * - 单例服务，全局可用
 * - 轻量级实现
 * - 可扩展的服务架构
 *
 * @author NestJS Template
 * @version 1.0.0
 */
import { getErrorMessage } from '@/utils';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// Package.json 类型定义
interface PackageJson {
  name: string;
  version: string;
  description?: string;
  author?: string;
  license?: string;
}

/**
 * 应用根服务类
 *
 * 基本信息获取等通用服务
 */
@Injectable()
export class AppService implements OnModuleInit {
  private packageJson!: PackageJson;

  async onModuleInit(): Promise<void> {
    // 在模块初始化时读取 package.json 文件，提供更好的错误处理
    const packageJsonPath = join(process.cwd(), 'package.json');

    if (!existsSync(packageJsonPath)) {
      throw new Error(`package.json not found at ${packageJsonPath}`);
    }

    try {
      const fileContent = readFileSync(packageJsonPath, 'utf8');
      this.packageJson = JSON.parse(fileContent) as PackageJson;
    } catch (error) {
      throw new Error(`Failed to read or parse package.json: ${getErrorMessage(error)}`);
    }
  }
  /**
   * 获取应用欢迎信息
   *
   * 功能:
   * - 返回应用的基本欢迎信息
   * - 用于健康检查和服务状态验证
   * - 动态获取应用名称和版本信息
   *
   * @returns 欢迎信息对象
   *
   * @example
   * ```typescript
   * const response = appService.getHello();
   * console.log(response.message); // "Hello nestjs-template v0.0.1"
   * ```
   */
  getHello(): {
    message: string;
    timestamp: string;
    version: string;
  } {
    return {
      message: `Hello ${this.packageJson.name} v${this.packageJson.version}`,
      timestamp: new Date().toISOString(),
      version: this.packageJson.version,
    };
  }

  /**
   * 获取应用版本信息
   *
   * 功能:
   * - 从 package.json 动态获取应用版本号
   * - 提供构建信息和应用描述
   * - 支持版本管理和监控
   *
   * @returns 版本信息对象
   *
   * @example
   * ```typescript
   * const info = appService.getVersion();
   * console.log(info.version); // "0.0.1"
   * console.log(info.name); // "nestjs-template"
   * ```
   */
  getVersion(): {
    version: string;
    name: string;
    description?: string;
    author?: string;
    license?: string;
  } {
    return {
      version: this.packageJson.version,
      name: this.packageJson.name,
      description: this.packageJson.description,
      author: this.packageJson.author,
      license: this.packageJson.license,
    };
  }

  /**
   * 获取应用完整信息
   *
   * 功能:
   * - 返回应用的完整信息
   * - 包含版本、描述、作者等详细信息
   * - 用于系统信息展示和调试
   *
   * @returns 应用完整信息对象
   *
   * @example
   * ```typescript
   * const info = appService.getAppInfo();
   * console.log(info);
   * ```
   */
  getAppInfo(): {
    name: string;
    version: string;
    description?: string;
    author?: string;
    license?: string;
    environment: string;
    nodeVersion: string;
    uptime: number;
  } {
    return {
      name: this.packageJson.name,
      version: this.packageJson.version,
      description: this.packageJson.description,
      author: this.packageJson.author,
      license: this.packageJson.license,
      environment: process.env.NODE_ENV ?? 'development',
      nodeVersion: process.version,
      uptime: process.uptime(),
    };
  }
}
