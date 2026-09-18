import { Injectable, ValidationPipe } from '@nestjs/common';
import { BusinessException } from '@/common/exceptions';
import type { ValidationError } from 'class-validator';

/**
 * 自定义验证管道，提供中文错误消息
 * 继承自NestJS的ValidationPipe，添加了中文错误消息处理
 */
@Injectable()
export class CustomValidationPipe extends ValidationPipe {
  constructor() {
    super({
      transform: true, // 启用自动类型转换
      transformOptions: {
        enableImplicitConversion: true, // 启用隐式类型转换
      },
      whitelist: true, // 只保留DTO中定义的属性
      forbidNonWhitelisted: true, // 禁止未定义的属性
      exceptionFactory: (errors: ValidationError[]) => {
        // 自定义错误消息处理，将英文错误消息转换为中文
        const messages = errors
          .map((error) => {
            if (error.constraints) {
              // 处理字段验证错误（如 @IsNotEmpty, @IsString 等）
              return Object.values(error.constraints).map((msg) => {
                // 将常见的英文错误消息转换为中文
                if (msg.includes('should not exist')) {
                  return `属性 ${error.property} 不应该存在`;
                }
                return msg;
              });
            } else if (error.property && !error.constraints) {
              // 处理禁止的额外属性错误（forbidNonWhitelisted: true）
              // 当属性不在白名单中时，class-validator不会设置constraints
              return `属性 ${error.property} 不应该存在`;
            }
            return '验证失败';
          })
          .flat();

        return BusinessException.badRequest('请求参数不合法', {
          validationErrors: messages,
        });
      },
    });
  }
}
