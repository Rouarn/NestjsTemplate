import { BusinessException } from '#/common/exceptions/index.js';
import { Injectable, ValidationPipe } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

/**
 * 单字段校验错误
 *
 * 保留「字段路径 → 错误文案」的对应关系，便于前端按表单项定位错误。
 */
export interface FieldValidationError {
  /** 字段路径，嵌套对象 / 数组形如 `address.city`、`items[0].name` */
  field: string;
  /** 该字段触发的全部校验文案（文案在 DTO 装饰器的 message 中声明，管道不负责翻译） */
  messages: string[];
}

/**
 * `forbidNonWhitelisted` 生成的约束键
 *
 * 多余属性错误由管道配置产生、无法在 DTO 装饰器中声明 message，
 * 因此按约束键（而非匹配英文文案）在此统一处理。
 */
const WHITELIST_CONSTRAINT = 'whitelistValidation';

/** 拼接嵌套字段路径，数组下标使用 `[index]` 形式 */
function joinFieldPath(parentPath: string, property: string): string {
  if (!parentPath) return property;
  return /^\d+$/.test(property) ? `${parentPath}[${property}]` : `${parentPath}.${property}`;
}

/**
 * 递归摊平 class-validator 的校验错误树
 *
 * 嵌套对象 / 数组（`@ValidateNested`）的字段级错误挂在 `children` 中，
 * 自身没有 `constraints`，必须向下递归，否则会丢失或误报错误。
 */
function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): FieldValidationError[] {
  return errors.flatMap((error) => {
    const field = joinFieldPath(parentPath, error.property);
    const result: FieldValidationError[] = [];

    if (error.constraints) {
      result.push({
        field,
        messages: Object.entries(error.constraints).map(([key, message]) =>
          key === WHITELIST_CONSTRAINT ? `属性 ${field} 不允许传入` : message,
        ),
      });
    }

    if (error.children?.length) {
      result.push(...flattenValidationErrors(error.children, field));
    }

    return result;
  });
}

/**
 * 自定义验证管道（全局）
 *
 * 继承 NestJS 内置 `ValidationPipe`，职责仅限两件事：
 * 1. 统一入参的转换 / 白名单配置；
 * 2. 将 class-validator 的校验错误树结构化为 `{ field, messages }[]`，
 *    并收敛为项目统一的 `BusinessException`。
 *
 * 注意：错误文案的翻译不在本管道中完成，统一由 DTO 装饰器的
 * `message` 选项（或 i18n 层声明，避免依赖 class-validator 的内部英文措辞。
 */
@Injectable()
export class CustomValidationPipe extends ValidationPipe {
  constructor() {
    super({
      transform: true, // 将 plain payload 转换为 DTO 实例（不做基于反射类型的隐式转换）
      // 不启用 enableImplicitConversion 隐式类型转换选项：
      // query 参数均为字符串，隐式转换存在 `Boolean("false") === true`、
      // `Number("abc") === NaN` 等陷阱；需要转换的字段在 DTO 中用
      // `@Type(() => Number/Boolean)` 或显式 `@Transform` 逐个声明。
      whitelist: true, // 只保留DTO中定义的属性
      forbidNonWhitelisted: true, // 禁止未定义的属性
      exceptionFactory: (errors: ValidationError[]) => {
        return BusinessException.badRequest('请求参数不合法', {
          validationErrors: flattenValidationErrors(errors),
        });
      },
    });
  }
}
