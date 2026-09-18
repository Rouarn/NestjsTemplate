/**
 * NestJS 应用根模块
 *
 * 功能说明:
 * - 配置应用的核心模块和依赖注入
 * - 设置全局守卫、拦截器、管道和过滤器
 * - 集成数据库、JWT认证、配置管理等基础服务
 * - 注册业务模块（认证、文件管理等）
 *
 * 架构特点:
 * - 模块化设计，职责分离
 * - 全局服务统一配置
 * - 依赖注入和配置驱动
 * - 支持热重载和环境切换
 *
 * @author NestJS Template
 * @version 1.0.0
 */
import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core/constants';
import { JwtModule } from '@nestjs/jwt';
// 应用核心组件
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HttpExceptionFilter } from './common/filters';
import { JwtAuthGuard } from './common/guards';
import { ResponseInterceptor } from './common/interceptors';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { CustomValidationPipe } from './common/pipes';
// 配置模块导入
import { ConfigModule as AppConfigModule, AppConfigService } from './config';
// 业务模块导入
import { DatabaseModule } from '@/database';
import { FilesModule } from '@/shared/files/files.module';
import { LoggerModule } from '@/shared/logger/logger.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';

/**
 * 应用根模块配置
 *
 * 采用 NestJS 模块化架构，统一管理应用的所有依赖和配置
 */
@Module({
  imports: [
    // =============================================================================
    // 配置模块 - 环境变量和应用配置管理
    // =============================================================================
    AppConfigModule,
    LoggerModule,

    // =============================================================================
    // JWT 认证模块 - 全局 JWT 服务配置
    // =============================================================================
    JwtModule.registerAsync({
      global: true, // 全局可用，无需在每个模块中重复导入
      inject: [AppConfigService], // 注入配置服务
      useFactory: (appConfig: AppConfigService) => {
        return {
          secret: appConfig.jwtOptions.secret, // JWT 签名密钥
          signOptions: {
            expiresIn: appConfig.jwtOptions.accessTokenTtl, // JWT 过期时间
            algorithm: 'HS256',
          },
          verifyOptions: {
            algorithms: ['HS256'],
          },
        };
      },
    }),

    // =============================================================================
    // 数据库模块 - TypeORM 配置 (统一在 DatabaseModule 中管理)
    // =============================================================================
    DatabaseModule,

    // =============================================================================
    // 业务模块 - 应用功能模块
    // =============================================================================
    // 业务模块注册
    AuthModule, // 用户认证模块 (登录、注册、验证码)
    UsersModule, // 用户管理模块 (用户资料、状态管理、CRUD)
    FilesModule, // 文件管理模块 (上传、下载、存储)
  ],

  // =============================================================================
  // 控制器注册
  // =============================================================================
  controllers: [
    AppController, // 应用根控制器 (健康检查、欢迎页面)
  ],

  // =============================================================================
  // 服务提供者配置
  // =============================================================================
  providers: [
    // 应用核心服务
    AppService, // 应用根服务

    // =============================================================================
    // 全局守卫配置 - 按优先级顺序执行
    // =============================================================================
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // JWT 认证守卫 (验证访问令牌)
    },

    // =============================================================================
    // 全局拦截器 - 统一响应格式化和请求追踪
    // =============================================================================
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor, // 响应格式化拦截器 (统一响应格式)
    },

    // =============================================================================
    // 全局管道配置
    // =============================================================================
    {
      provide: APP_PIPE,
      useClass: CustomValidationPipe, // 自定义验证管道 (全局验证)
    },

    // =============================================================================
    // 全局异常过滤器 - 统一错误处理和调试诊断
    // =============================================================================

    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter, // HTTP 异常过滤器 (统一错误处理)
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(LoggerMiddleware).forRoutes({ path: '*path', method: RequestMethod.ALL });
  }
}
