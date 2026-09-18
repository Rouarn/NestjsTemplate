/**
 * 存储适配器注入 token。
 *
 * 业务代码面向该 token 注入 StorageAdapter，更换存储后端（本地磁盘 / OSS / S3）
 * 时只需在 FilesModule 中修改 useClass 绑定，消费方无需任何改动。
 */
export const STORAGE_ADAPTER = Symbol('STORAGE_ADAPTER');

export interface StorageAdapter {
  /**
   * 将已落盘的源文件（如 Multer 磁盘存储产生的临时文件）存入目标位置
   * @param sourcePath 源文件的绝对路径
   * @param relativePath 存储相对路径 (如 2024/03/uuid.jpg)
   * @returns 存储后的相对路径
   */
  upload(sourcePath: string, relativePath: string): Promise<string>;
  download(relativePath: string): Promise<Buffer>;
  delete(relativePath: string): Promise<boolean>;
  exists(relativePath: string): Promise<boolean>;
  /**
   * 生成访问 URL
   * @returns [relativeUrl, completeUrl] 相对路径与完整路径
   */
  getUrl(relativePath: string): [string, string];
}
