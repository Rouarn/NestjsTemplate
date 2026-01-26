import { BusinessExceptionFactory } from '@/common/exceptions';
import { readFileSync } from 'fs';
import { extname } from 'path';
import type { FieldMapping, FileLike, SupportedFormat } from './types';

export function detectFormat(file: FileLike, fallback?: SupportedFormat): SupportedFormat {
  if (typeof file === 'string') {
    const ext = extname(file).toLowerCase();
    if (ext.endsWith('.xlsx')) return 'xlsx';
    if (ext.endsWith('.csv')) return 'csv';
    if (ext.endsWith('.json')) return 'json';
  } else if (
    typeof file === 'object' &&
    file !== null &&
    'originalname' in file &&
    file.originalname
  ) {
    const ext = extname(file.originalname).toLowerCase();
    if (ext.endsWith('.xlsx')) return 'xlsx';
    if (ext.endsWith('.csv')) return 'csv';
    if (ext.endsWith('.json')) return 'json';
  }
  return fallback ?? 'csv';
}

export function ensureBuffer(file: FileLike): Buffer {
  if (Buffer.isBuffer(file)) return file;
  if (typeof file === 'string') return readFileSync(file);
  if (typeof file === 'object' && file !== null && 'buffer' in file) {
    const fb = file as { buffer: Buffer };
    return fb.buffer;
  }
  throw BusinessExceptionFactory.invalidParameter('文件输入', {
    message: 'Unsupported file input',
  });
}

export function chunkArray<T>(arr: T[], size: number): T[][] {
  if (!size || size <= 0) return [arr];
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export function applyMapping(
  record: Record<string, unknown>,
  mapping?: FieldMapping,
): Record<string, unknown> {
  if (!mapping) return { ...record };
  const out: Record<string, unknown> = {};

  // 预处理 record keys，建立去空格后的 key 映射，以支持模糊匹配
  const normalizedKeys: Record<string, string> = {};
  Object.keys(record).forEach((k) => {
    normalizedKeys[k.trim()] = k;
  });

  for (const internal of Object.keys(mapping)) {
    const m = mapping[internal];
    if (typeof m === 'string') {
      // 1. 尝试精确匹配
      if (Object.prototype.hasOwnProperty.call(record, m)) {
        out[internal] = record[m];
      } else {
        // 2. 尝试去空格匹配
        const trimmedM = m.trim();
        const actualKey = normalizedKeys[trimmedM];
        if (actualKey && Object.prototype.hasOwnProperty.call(record, actualKey)) {
          out[internal] = record[actualKey];
        } else {
          // 3. 仍未找到，赋值 undefined
          out[internal] = undefined;
        }
      }
    } else if (typeof m === 'function') {
      const v = record[internal];
      out[internal] = m(v, record);
    }
  }
  return out;
}

export function reverseMapping(
  record: Record<string, unknown>,
  mapping?: FieldMapping,
): Record<string, unknown> {
  if (!mapping) return { ...record };
  const out: Record<string, unknown> = {};
  for (const internal of Object.keys(mapping)) {
    const m = mapping[internal];
    if (typeof m === 'string') {
      out[m] = record[internal];
    } else if (typeof m === 'function') {
      out[internal] = record[internal];
    }
  }
  return out;
}

export function toCsv(
  rows: readonly Record<string, unknown>[],
  headers?: string[],
  delimiter = ',',
): string {
  const hdrs = headers?.length ? headers : inferHeaders(rows);
  const lines: string[] = [];
  lines.push(escapeCsvRow(hdrs, delimiter));
  for (const row of rows) {
    const values = hdrs.map((h) => row?.[h]);
    lines.push(escapeCsvRow(values, delimiter));
  }
  return lines.join('\n');
}

export function parseCsv(
  text: string,
  options?: { delimiter?: string; headers?: string[]; skipHeader?: boolean },
): Record<string, unknown>[] {
  const delimiter = options?.delimiter ?? ',';
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  let headers = options?.headers;
  const start = options?.skipHeader ? 0 : 1;
  headers ??= splitCsvLine(lines[0], delimiter);
  const out: Record<string, unknown>[] = [];
  for (let i = start; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i], delimiter);
    const obj: Record<string, unknown> = {};
    for (let j = 0; j < headers.length; j++) obj[headers[j]] = cols[j];
    out.push(obj);
  }
  return out;
}

function inferHeaders(rows: readonly Record<string, unknown>[]): string[] {
  if (!rows.length) return [];
  return Array.from(
    rows.reduce((set: Set<string>, r: Record<string, unknown>) => {
      Object.keys(r ?? {}).forEach((k) => set.add(k));
      return set;
    }, new Set<string>()),
  );
}

function escapeCsvRow(values: unknown[], delimiter: string): string {
  return values
    .map((v) => (v === null || v === undefined ? '' : String(v)))
    .map((s) => {
      const needsQuote =
        s.includes('\n') || s.includes('\r') || s.includes('"') || s.includes(delimiter);
      const escaped = s.replace(/"/g, '""');
      return needsQuote ? `"${escaped}"` : escaped;
    })
    .join(delimiter);
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === delimiter) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}
