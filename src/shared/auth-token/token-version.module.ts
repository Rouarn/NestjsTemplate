import { DatabaseModule } from '../../database/index.js';
import { Global, Module } from '@nestjs/common';
import { TokenVersionService } from './token-version.service.js';

/**
 * 令牌版本模块
 *
 * 声明为全局模块，使全局守卫与各业务服务都能注入 `TokenVersionService`
 * 而不必互相 import（避免 Auth / Users 之间的循环依赖）。
 */
@Global()
@Module({
  imports: [DatabaseModule],
  providers: [TokenVersionService],
  exports: [TokenVersionService],
})
export class TokenVersionModule {}
