import { type CustomDecorator, SetMetadata } from '@nestjs/common';

/** 上传配额元数据键，供 FileUploadGuard 通过 Reflector 读取 */
export const UPLOAD_QUOTA_KEY = 'upload:quota';

/**
 * 路由级文件数量配额：
 * - 数字：该接口允许的最大文件数
 * - 'max'：使用环境变量 NEST_UPLOAD_MAX_FILES 的配置值
 */
export type UploadQuotaValue = number | 'max';

/**
 * 设置上传接口的文件数量配额
 *
 * FileUploadGuard 据此计算 Content-Length 预检上限，
 * 替代按 URL 路径字符串判断接口类型的脆弱做法。
 */
export const UploadQuota = (maxFiles: UploadQuotaValue): CustomDecorator =>
  SetMetadata(UPLOAD_QUOTA_KEY, maxFiles);
