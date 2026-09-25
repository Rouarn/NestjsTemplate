import { BaseEntity } from '#/database/index.js';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * 文件元数据实体
 *
 * 记录每一次成功上传的文件信息，用于审计、按上传者查询和后续清理。
 * 仅保存元数据，文件内容仍由存储适配器管理。
 */
@Entity('files', { comment: '文件元数据表' })
export class File extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { comment: '文件ID' })
  id!: string;

  @Column({ name: 'original_name', length: 255, comment: '原始文件名' })
  originalName!: string;

  /** 存储相对路径 (如 2024/03/uuid.jpg)，删除文件时以此为凭 */
  @Column({ name: 'stored_path', length: 512, unique: true, comment: '存储相对路径' })
  storedPath!: string;

  @Column({ name: 'mime_type', length: 128, comment: '文件真实MIME类型' })
  mimeType!: string;

  @Column({ name: 'size', type: 'bigint', unsigned: true, comment: '文件大小(字节)' })
  size!: number;

  // 联合类型 string | null 会使 design:type 元数据退化为 Object，必须显式声明列类型
  @Column({
    name: 'uploader_id',
    type: 'varchar',
    length: 36,
    nullable: true,
    comment: '上传者用户ID',
  })
  uploaderId!: string | null;
}
