import { formatDate } from '@/utils';
import XLSX from 'xlsx';
import type {
  ExportConfig,
  ExportResult,
  FileLike,
  ImportConfig,
  ImportError,
  ImportResult,
  SupportedFormat,
} from './types';
import {
  applyMapping,
  chunkArray,
  detectFormat,
  ensureBuffer,
  parseCsv,
  reverseMapping,
  toCsv,
} from './utils';

export class ImportExportService {
  /**
   * 导出数据到指定格式文件
   */
  async exportToFile<T>(data: T[], config: ExportConfig): Promise<ExportResult> {
    const format = config.format;
    const headers = config.headers?.length
      ? config.headers
      : this.inferHeadersForExport(data, config.mapping);
    const chunkSize = config.chunkSize && config.chunkSize > 0 ? config.chunkSize : data.length;
    let fileName = config.fileName ?? this.defaultFileName(format);

    // 如果文件名没有对应的后缀，自动补全
    if (!fileName.toLowerCase().endsWith(`.${format}`)) {
      // 特殊处理：json 和 ndjson 都可以用 json 后缀，或者 ndjson 后缀，这里简单起见统一检查
      // 如果是 json format 且配置了 ndjson，可能用户想用 .ndjson，但这里简单处理，只补全 format
      // 实际上通常用户只传 'filename'，我们补 '.xlsx'
      fileName = `${fileName}.${format === 'csv' ? 'csv' : format === 'xlsx' ? 'xlsx' : 'json'}`;
    }

    if (format === 'csv') {
      const mapped = data.map((r) => reverseMapping(r as Record<string, unknown>, config.mapping));
      const chunks = chunkArray(mapped, chunkSize);
      const csvPieces = chunks.map((c) => toCsv(c, headers, config.csv?.delimiter ?? ','));
      const csvText = [
        toCsv([], headers, config.csv?.delimiter ?? ',').split('\n')[0],
        ...csvPieces.flatMap((t) => t.split('\n').slice(1)),
      ].join('\n');
      const buffer = Buffer.from(csvText, 'utf-8');
      return { buffer, mimeType: 'text/csv', fileName };
    }

    if (format === 'json') {
      const mapped = data.map((r) => reverseMapping(r as Record<string, unknown>, config.mapping));
      let text: string;
      if (config.json?.ndjson) {
        const lines: string[] = [];
        for (const chunk of chunkArray(mapped, chunkSize))
          for (const row of chunk) lines.push(JSON.stringify(row));
        text = lines.join('\n');
      } else {
        text = JSON.stringify(mapped);
      }
      const buffer = Buffer.from(text, 'utf-8');
      return { buffer, mimeType: 'application/json', fileName };
    }

    if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([headers]);
      for (const chunk of chunkArray(data, chunkSize)) {
        const mapped = chunk.map((r) =>
          reverseMapping(r as Record<string, unknown>, config.mapping),
        );
        XLSX.utils.sheet_add_json(ws, mapped, {
          origin: -1,
          header: headers,
          skipHeader: true,
        });
      }
      XLSX.utils.book_append_sheet(wb, ws, config.sheetName ?? 'Sheet1');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
      return {
        buffer,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        fileName,
      };
    }

    throw new Error(`Unsupported export format: ${format}`);
  }

  /**
   * 从文件导入数据并进行映射与校验
   */
  async importFromFile<T>(file: FileLike, config: ImportConfig<T>): Promise<ImportResult<T>> {
    const format = config.format ?? detectFormat(file);
    const buffer = ensureBuffer(file);
    const chunkSize = config.chunkSize && config.chunkSize > 0 ? config.chunkSize : 0;
    const errors: ImportError[] = [];
    const out: T[] = [];

    if (format === 'xlsx') {
      const wb = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = config.sheetName ?? wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null });
      await this.processRecords(records, config, out, errors, chunkSize);
      return { data: out, errors: errors.length ? errors : undefined };
    }

    if (format === 'csv') {
      const text = buffer.toString('utf-8');
      const records = parseCsv(text, {
        delimiter: config.csv?.delimiter ?? ',',
        headers: config.csv?.headers,
        skipHeader: false,
      });
      await this.processRecords(records, config, out, errors, chunkSize);
      return { data: out, errors: errors.length ? errors : undefined };
    }

    if (format === 'json') {
      const text = buffer.toString('utf-8').trim();
      let records: Record<string, unknown>[];
      if (config.json?.ndjson || (!text.startsWith('[') && text.includes('\n'))) {
        records = text
          .split(/\r?\n/)
          .filter((l) => l.trim().length > 0)
          .map((l) => JSON.parse(l) as Record<string, unknown>);
      } else {
        const arr = JSON.parse(text);
        records = Array.isArray(arr)
          ? (arr as Record<string, unknown>[])
          : [arr as Record<string, unknown>];
      }
      await this.processRecords(records, config, out, errors, chunkSize);
      return { data: out, errors: errors.length ? errors : undefined };
    }

    throw new Error(`Unsupported import format: ${format}`);
  }

  /**
   * 错误处理接口，将错误转换为结构化信息
   */
  handleImportError(error: Error): ImportError {
    const message = error.message || 'Unknown error';
    const code = this.classifyErrorCode(message);
    return { code, message, original: error };
  }

  private async processRecords<T>(
    records: Record<string, unknown>[],
    config: ImportConfig<T>,
    out: T[],
    errors: ImportError[],
    chunkSize: number,
  ): Promise<void> {
    const mapped: T[] = [];
    for (let i = 0; i < records.length; i++) {
      const raw = records[i];
      const base = applyMapping(raw, config.mapping);
      let obj: T = config.transform ? config.transform(base) : (base as T);
      if (config.schema) {
        const res = config.schema.validate(obj, { abortEarly: false });
        if (res.error) {
          for (const d of res.error.details) {
            errors.push({
              code: 'VALIDATION_ERROR',
              message: d.message,
              row: i + 1,
              field: d.path?.[0] as string,
              original: raw,
            });
          }
          continue;
        }
        obj = res.value;
      }
      mapped.push(obj);
      if (chunkSize > 0 && mapped.length >= chunkSize) {
        if (config.onChunk) await Promise.resolve(config.onChunk(mapped.slice()));
        out.push(...mapped);
        mapped.length = 0;
      }
    }
    if (mapped.length) {
      if (config.onChunk) await Promise.resolve(config.onChunk(mapped.slice()));
      out.push(...mapped);
    }
  }

  private inferHeadersForExport(
    data: readonly unknown[],
    mapping?: Record<string, unknown>,
  ): string[] {
    if (mapping && Object.keys(mapping).length) {
      const headers: string[] = [];
      for (const k of Object.keys(mapping)) {
        const m = mapping[k];
        if (typeof m === 'string') headers.push(m);
        else headers.push(k);
      }
      return headers;
    }
    const set = new Set<string>();
    for (const r of data) Object.keys(r ?? {}).forEach((k) => set.add(k));
    return Array.from(set);
  }

  private classifyErrorCode(message: string): string {
    if (/unsupported/i.test(message)) return 'UNSUPPORTED_FORMAT';
    if (/parse|json/i.test(message)) return 'PARSE_ERROR';
    if (/sheet|xlsx/i.test(message)) return 'XLSX_ERROR';
    return 'UNKNOWN_ERROR';
  }

  private defaultFileName(format: SupportedFormat): string {
    const ts = formatDate(new Date(), 'YYYY-MM-DD_HH-mm-ss');
    if (format === 'xlsx') return `export-${ts}.xlsx`;
    if (format === 'csv') return `export-${ts}.csv`;
    return `export-${ts}.json`;
  }
}
