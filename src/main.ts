/**
 * 应用程序启动入口文件
 *
 * 负责初始化NestJS应用程序，配置中间件、静态资源、API文档等
 *
 * @author NestJS Template
 * @version 1.0.0
 */

import { VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import cors from 'cors';
import * as fs from 'fs';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import * as path from 'path';
import { AppModule } from './app.module';
import { BootstrapLogHelper } from './common/helpers';
import { AppConfigService } from './config';

/**
 * 解析静态资源路径
 */
function resolveStaticPath(staticConfig: { root: string }): string {
  if (path.isAbsolute(staticConfig.root)) {
    return staticConfig.root;
  }

  return path.resolve(process.cwd(), staticConfig.root);
}

/**
 * 配置应用基础设置
 */
function configureApp(app: NestExpressApplication, appConfig: AppConfigService): void {
  // 启用 GZIP 压缩 Accept-Encoding: gzip
  app.use(compression());

  // 配置CORS跨域策略
  app.use(cors(appConfig.corsOptions));
}

/**
 * 配置API版本控制
 */
function configureVersioning(app: NestExpressApplication, appConfig: AppConfigService): void {
  const versionConfig = appConfig.apiVersioning;

  if (versionConfig.type === 'uri') {
    app.enableVersioning({
      type: VersioningType.URI,
      prefix: `${versionConfig.prefix}/v`,
      defaultVersion: versionConfig.defaultVersion,
    });
  } else if (versionConfig.type === 'header') {
    app.setGlobalPrefix(versionConfig.prefix);
    app.enableVersioning({
      type: VersioningType.HEADER,
      header: versionConfig.header,
      defaultVersion: versionConfig.defaultVersion,
    });
  }
}

/**
 * 配置静态资源服务
 */
function configureStaticAssets(app: NestExpressApplication, appConfig: AppConfigService): string {
  const staticConfig = appConfig.staticAssetsOptions;
  const staticPath = resolveStaticPath(staticConfig);

  BootstrapLogHelper.logStaticResourceConfig(staticConfig, staticPath);
  app.useStaticAssets(staticPath, staticConfig.options);

  return staticPath;
}

/**
 * 配置Swagger API文档
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

  // 如果启用了 Header 版本控制，添加全局 Header 参数
  if (appConfig.apiVersioning.type === 'header') {
    builder.addGlobalParameters({
      name: appConfig.apiVersioning.header,
      in: 'header',
      description: 'API 版本号',
      required: false,
      schema: {
        type: 'string',
        default: appConfig.apiVersioning.defaultVersion,
      },
    });
  }

  const options = builder.build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup(swaggerOptions.prefix, app, document);

  // 导出API文档为JSON
  const apiDocPath = path.join(staticPath, swaggerOptions.filename);

  if (!fs.existsSync(staticPath)) {
    fs.mkdirSync(staticPath, { recursive: true });
  }

  if (fs.existsSync(apiDocPath) && fs.statSync(apiDocPath).isDirectory()) {
    fs.rmSync(apiDocPath, { recursive: true });
  }

  fs.writeFileSync(apiDocPath, JSON.stringify(document, null, 2));

  BootstrapLogHelper.logApiDocumentSaved(
    apiDocPath,
    appConfig.baseUrl,
    appConfig.staticAssetsOptions.options.prefix,
    swaggerOptions.filename,
  );
}

async function bootstrap(): Promise<void> {
  try {
    // 创建应用实例
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
      bufferLogs: true, // 缓存日志直到 Logger 初始化完成
    });

    // 获取配置服务
    const appConfig = app.get(AppConfigService);

    // 配置 Winston 日志服务
    app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

    // 配置应用组件
    configureApp(app, appConfig);
    configureVersioning(app, appConfig);
    const staticPath = configureStaticAssets(app, appConfig);
    configureSwagger(app, staticPath, appConfig);

    // 启动应用
    const port = appConfig.port;
    await app.listen(port);

    // 打印启动完成信息
    await BootstrapLogHelper.logApplicationStartup(
      app,
      appConfig,
      appConfig.apiVersioning,
      appConfig.staticAssetsOptions,
    );
  } catch (error) {
    await BootstrapLogHelper.logApplicationError(error);
    process.exit(1);
  }
}

void bootstrap();
