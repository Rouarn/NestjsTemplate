import { Status } from '@/common/enums';
import { BaseEntity } from '@/database';
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { FileType } from '../enums';

@Entity('files', { comment: '文件存储表' })
export class File extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { comment: '文件ID' })
  id: string;

  @Column({ name: 'filename', length: 255, comment: '存储文件名' })
  filename: string;

  @Column({ name: 'original_name', length: 255, comment: '原始文件名' })
  originalName: string;

  @Column({ name: 'mime_type', length: 100, comment: 'MIME类型' })
  mimeType: string;

  @Column({ name: 'size', type: 'bigint', unsigned: true, comment: '文件大小(字节)' })
  size: number;

  @Column({ name: 'path', length: 500, comment: '存储路径' })
  path: string;

  @Column({ name: 'hash', length: 64, unique: true, nullable: true, comment: '文件哈希值(SHA256)' })
  hash: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true, comment: '上传用户ID' })
  userId: string;

  @Column({
    name: 'upload_protocol',
    type: 'varchar',
    length: 20,
    default: 'HTTP',
    comment: '上传协议',
  })
  uploadProtocol: string;

  @Column({
    name: 'file_type',
    type: 'varchar',
    length: 20,
    default: FileType.OTHER,
    comment: '文件类型分类: IMAGE, VIDEO, AUDIO, DOCUMENT, ARCHIVE, OTHER',
  })
  fileType: FileType;

  @Column({ name: 'description', type: 'text', nullable: true, comment: '文件描述' })
  description: string;

  @Column({
    name: 'is_public',
    type: 'tinyint',
    default: Status.DISABLED,
    comment: '是否公开访问: 0-否, 1-是',
  })
  isPublic: Status;
}
