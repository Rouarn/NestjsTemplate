import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';

/**
 * Swagger 单文件上传文档装饰器
 * 组合 @ApiConsumes 与 @ApiBody，替代 Controller 中冗长的手写 schema
 */
export function ApiFile(fieldName = 'file'): ReturnType<typeof applyDecorators> {
  return applyDecorators(
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          [fieldName]: {
            type: 'string',
            format: 'binary',
          },
        },
        required: [fieldName],
      },
    }),
  );
}

/**
 * Swagger 多文件上传文档装饰器
 */
export function ApiFiles(fieldName = 'files'): ReturnType<typeof applyDecorators> {
  return applyDecorators(
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          [fieldName]: {
            type: 'array',
            items: {
              type: 'string',
              format: 'binary',
            },
          },
        },
        required: [fieldName],
      },
    }),
  );
}
