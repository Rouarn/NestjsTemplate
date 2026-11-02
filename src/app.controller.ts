/**
 * 应用根控制器
 *
 * 提供健康检查与基础信息服务，全部为公开接口（不要求登录）。
 * 健康检查用于负载均衡 / 容器探针，因此跳过限流并真实探测数据库。
 */
import { Public } from './common/decorators/index.js';
import { BusinessException } from './common/exceptions/index.js';
import { DatabaseService } from './database/index.js';
import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import {
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AppService } from './app.service.js';

class HelloResponseDto {
  @ApiProperty({ description: '欢迎消息', example: 'Hello nestjs-template v0.0.1' })
  message!: string;

  @ApiProperty({ description: '服务端当前时间（ISO 8601）', example: '2026-01-01T00:00:00.000Z' })
  timestamp!: string;

  @ApiProperty({ description: '版本号', example: '0.0.1' })
  version!: string;
}

class AppInfoResponseDto {
  @ApiProperty({ description: '应用名称', example: 'nestjs-template' })
  name!: string;

  @ApiProperty({ description: '版本号', example: '0.0.1' })
  version!: string;

  @ApiPropertyOptional({ description: '应用描述' })
  description?: string;

  @ApiPropertyOptional({ description: '作者' })
  author?: string;

  @ApiPropertyOptional({ description: '许可证' })
  license?: string;

  @ApiProperty({ description: '进程运行时长（秒）', example: 12.34 })
  uptime!: number;
}

class HealthResponseDto {
  @ApiProperty({ description: '服务状态', example: 'ok' })
  status!: 'ok';

  @ApiProperty({ description: '数据库状态', example: 'up' })
  database!: 'up';

  @ApiProperty({ description: '进程运行时长（秒）', example: 12.34 })
  uptime!: number;

  @ApiProperty({ description: '检查时间（ISO 8601）' })
  timestamp!: string;
}

@ApiTags('应用')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly databaseService: DatabaseService,
  ) {}

  @ApiOperation({ summary: '获取欢迎信息', description: '最简单的存活检查，不访问数据库' })
  @ApiResponse({ status: 200, description: '成功', type: HelloResponseDto })
  @Public()
  @Get()
  getHello(): HelloResponseDto {
    return this.appService.getHello();
  }

  @ApiOperation({ summary: '获取版本信息' })
  @ApiResponse({ status: 200, description: '成功', type: AppInfoResponseDto })
  @Public()
  @Get('version')
  getVersion(): AppInfoResponseDto {
    return this.appService.getAppInfo();
  }

  @ApiOperation({ summary: '获取应用信息' })
  @ApiResponse({ status: 200, description: '成功', type: AppInfoResponseDto })
  @Public()
  @Get('info')
  getAppInfo(): AppInfoResponseDto {
    return this.appService.getAppInfo();
  }

  /**
   * 健康检查
   *
   * 真实执行 `SELECT 1`：进程存活但数据库断开时返回 503，
   * 便于负载均衡摘除实例。跳过节流，避免探针被限流误判。
   */
  @ApiOperation({ summary: '健康检查', description: '检查进程与数据库连通性，供探针使用' })
  @ApiResponse({ status: 200, description: '健康', type: HealthResponseDto })
  @ApiResponse({ status: 503, description: '数据库不可用' })
  @Public()
  @SkipThrottle()
  @Get('health')
  async health(): Promise<HealthResponseDto> {
    const databaseUp = await this.databaseService.ping();

    if (!databaseUp) {
      throw BusinessException.unavailable('服务不可用', { database: 'down' });
    }

    return {
      status: 'ok',
      database: 'up',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
