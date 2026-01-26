import type { ObjectSchema } from 'joi';

export type SupportedFormat = 'xlsx' | 'csv' | 'json';

export interface FieldMapping {
  [internalField: string]: string | ((value: unknown, raw: Record<string, unknown>) => unknown);
}

export interface CsvOptions {
  delimiter?: string;
  headers?: string[];
  skipHeader?: boolean;
}

export interface JsonOptions {
  ndjson?: boolean;
}

export interface ImportConfig<T = unknown> {
  format?: SupportedFormat;
  mapping?: FieldMapping;
  transform?: (raw: Record<string, unknown>) => T;
  schema?: ObjectSchema<T>;
  chunkSize?: number;
  sheetName?: string;
  csv?: CsvOptions;
  json?: JsonOptions;
  onChunk?: (chunk: T[]) => Promise<void> | void;
}

export interface ExportConfig {
  format: SupportedFormat;
  mapping?: FieldMapping;
  headers?: string[];
  chunkSize?: number;
  sheetName?: string;
  fileName?: string;
  csv?: CsvOptions;
  json?: JsonOptions;
}

export interface FileBufferLike {
  buffer: Buffer;
  originalname?: string;
  mimetype?: string;
}

export type FileLike = Buffer | string | FileBufferLike;

export interface ImportError {
  code: string;
  message: string;
  row?: number;
  field?: string;
  original?: unknown;
}

export interface ImportResult<T = unknown> {
  data: T[];
  errors?: ImportError[];
  headers?: string[]; // 读取到的原始表头
}

export interface ExportResult {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}
