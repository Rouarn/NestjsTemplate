import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const { method, originalUrl, query, body, ip } = req;
    const startTime = Date.now();

    res.on('finish', () => {
      const { statusCode, statusMessage } = res;
      const responseTime = Date.now() - startTime;

      const message = `${method} ${originalUrl} ${statusCode} - ${responseTime}ms`;

      const logData = {
        method,
        url: originalUrl,
        query,
        body,
        ip,
        statusCode,
        responseTime,
      };

      if (statusCode >= 500) {
        this.logger.error(message, { ...logData, trace: statusMessage });
      } else if (statusCode >= 400) {
        this.logger.warn(message, logData);
      } else {
        this.logger.info(message, logData);
      }
    });

    next();
  }
}
