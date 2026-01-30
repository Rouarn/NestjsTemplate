import { AppConfigService, ConfigModule } from '@/config';
import { Global, Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { createWinstonConfig } from './winston.config';

@Global()
@Module({
  imports: [
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [AppConfigService],
      useFactory: (configService: AppConfigService) => createWinstonConfig(configService),
    }),
  ],
  exports: [WinstonModule],
})
export class LoggerModule {}
