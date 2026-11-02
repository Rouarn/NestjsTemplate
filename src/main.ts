/**
 * 应用启动入口
 *
 * 负责创建 Nest 应用、注册全局中间件（安全头 / 压缩 / CORS）、
 * API 版本控制、静态资源与 Swagger 文档，并开启优雅停机。
 */
import { VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { existsSync, mkdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import 'reflect-metadata';
import { AppModule } from './app.module.js';
import { BootstrapLogHelper } from './common/helpers/index.js';
import type { StaticConfig } from './config/index.js';
import { AppConfigService } from './config/index.js';
import type { RequestHandler } from 'express';
import type { ServerResponse } from 'node:http';

/** JSON API 的收紧型 CSP（Swagger UI 需要内联脚本，单独放行） */
const API_CONTENT_SECURITY_POLICY = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'";

/**
 * 解析静态资源路径
 * @param staticConfig 静态资源配置
 * @returns 绝对路径
 */
function resolveStaticPath(staticConfig: StaticConfig): string {
  return isAbsolute(staticConfig.root)
    ? staticConfig.root
    : resolve(process.cwd(), staticConfig.root);
}

/**
 * 配置安全头、压缩与 CORS
 *
 * `trust proxy` 必须最先设置：后续的 `req.ip` / `req.protocol`（限流、审计、日志）
 * 都依赖它来决定是否信任 `X-Forwarded-*`。
 */
function configureApp(app: NestExpressApplication, appConfig: AppConfigService): void {
  if (appConfig.trustProxy > 0) {
    app.set('trust proxy', appConfig.trustProxy);
  }

  app.use(
    helmet({
      // Swagger UI 依赖内联脚本，全局 CSP 交由下方按路径注入
      contentSecurityPolicy: false,
      // 上传资源需要被跨源页面加载（前后端分离部署）
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(compression());
  app.use(cors(appConfig.corsOptions));

  // 非文档路径统一收紧 CSP：JSON API 不需要任何外部资源
  const swaggerPrefix = appConfig.swaggerOptions.prefix;
  const swaggerEnabled = appConfig.swaggerOptions.enabled;
  const apiCsp: RequestHandler = (req, res, next) => {
    if (swaggerEnabled && req.path.startsWith(swaggerPrefix)) {
      next();
      return;
    }
    res.setHeader('Content-Security-Policy', API_CONTENT_SECURITY_POLICY);
    next();
  };
  app.use(apiCsp);
}

/**
 * 配置 API 版本控制
 */
function configureVersioning(app: NestExpressApplication, appConfig: AppConfigService): void {
  const versionConfig = appConfig.apiVersioning;

  if (versionConfig.type === 'uri') {
    app.enableVersioning({
      type: VersioningType.URI,
      prefix: `${versionConfig.prefix}/v`,
      defaultVersion: versionConfig.defaultVersion,
    });
    return;
  }

  app.setGlobalPrefix(versionConfig.prefix);
  app.enableVersioning({
    type: VersioningType.HEADER,
    header: versionConfig.header,
    defaultVersion: versionConfig.defaultVersion,
  });
}

/**
 * 配置静态资源服务
 *
 * 上传文件以 UUID 命名、内容不可变，可长缓存；同目录下的 `api-docs.json`
 * 每次启动都会重写，必须显式禁用缓存，否则前端拿到的是旧契约。
 */
function configureStaticAssets(app: NestExpressApplication, appConfig: AppConfigService): string {
  const staticConfig = appConfig.staticAssetsOptions;
  const staticPath = resolveStaticPath(staticConfig);

  BootstrapLogHelper.logStaticResourceConfig(staticConfig, staticPath);

  app.useStaticAssets(staticPath, {
    prefix: staticConfig.prefix,
    maxAge: '30d',
    immutable: true,
    setHeaders: (res: ServerResponse, filePath: string) => {
      if (filePath.endsWith('.json')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  });

  return staticPath;
}

/**
 * 配置并导出 Swagger 文档
 *
 * JSON 先写临时文件再 rename，避免前端在启动瞬间读到半截文件。
 */
function configureSwagger(
  app: NestExpressApplication,
  staticPath: string,
  appConfig: AppConfigService,
): void {
  const swaggerOptions = appConfig.swaggerOptions;
  if (!swaggerOptions.enabled) return;

  const builder = new DocumentBuilder()
    .addBearerAuth()
    .setTitle(swaggerOptions.title)
    .setDescription(swaggerOptions.description)
    .setVersion(swaggerOptions.version);

  // Header 版本控制模式下，把版本号声明为全局请求头
  if (appConfig.apiVersioning.type === 'header') {
    builder.addGlobalParameters({
      name: appConfig.apiVersioning.header,
      in: 'header',
      description: 'API 版本号',
      required: false,
      schema: { type: 'string', default: appConfig.apiVersioning.defaultVersion },
    });
  }

  const document = SwaggerModule.createDocument(app, builder.build());
  SwaggerModule.setup(swaggerOptions.prefix, app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const apiDocPath = join(staticPath, swaggerOptions.filename);
  mkdirSync(staticPath, { recursive: true });

  // 目标路径被同名目录占用时先清理，避免写入失败
  if (existsSync(apiDocPath) && statSync(apiDocPath).isDirectory()) {
    rmSync(apiDocPath, { recursive: true });
  }

  const tempPath = `${apiDocPath}.tmp`;
  writeFileSync(tempPath, JSON.stringify(document, null, 2));
  renameSync(tempPath, apiDocPath);

  BootstrapLogHelper.logApiDocumentSaved(
    apiDocPath,
    appConfig.baseUrl,
    appConfig.staticAssetsOptions.prefix,
    swaggerOptions.filename,
  );
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true, // 缓存日志直到 Winston 接管
  });

  const appConfig = app.get(AppConfigService);
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  configureApp(app, appConfig);
  configureVersioning(app, appConfig);
  const staticPath = configureStaticAssets(app, appConfig);
  configureSwagger(app, staticPath, appConfig);

  // 让 SIGTERM/SIGINT 触发各模块的 onApplicationShutdown（含数据库连接关闭）
  app.enableShutdownHooks();

  await app.listen(appConfig.port);

  await BootstrapLogHelper.logApplicationStartup(
    app,
    appConfig,
    appConfig.apiVersioning,
    appConfig.staticAssetsOptions,
  );
}

bootstrap().catch((error: unknown) => {
  BootstrapLogHelper.logApplicationError(error);
  process.exit(1);
});
