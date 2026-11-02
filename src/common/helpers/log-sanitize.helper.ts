/**
 * 日志脱敏
 *
 * 日志是「写出去就收不回」的数据，模板默认不打印请求体；
 * 即使显式开启 `NEST_LOG_BODY`，也必须先经过本函数：
 * - 命中敏感键名的值统一替换为 `[REDACTED]`；
 * - 限制递归深度与数组长度，避免超大响应把日志撑爆。
 */

/** 需要脱敏的键名（大小写不敏感，匹配即整值替换） */
const SENSITIVE_KEY_PATTERN =
  /pass(word|wd)?|pwd|token|secret|authorization|cookie|session|captcha|credential|signature/i;

/** 单次脱敏的最大递归深度 */
const MAX_DEPTH = 6;

/** 数组最多保留的元素个数 */
const MAX_ARRAY_LENGTH = 50;

/** 超长字符串的截断长度 */
const MAX_STRING_LENGTH = 2_000;

/** 脱敏占位符 */
export const REDACTED = '[REDACTED]';

/**
 * 递归脱敏任意值
 * @param value 原始值（请求体、响应体、错误上下文等）
 * @param depth 当前递归深度
 * @returns 可安全写入日志的副本
 */
export function sanitizeForLog(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH
      ? `${value.slice(0, MAX_STRING_LENGTH)}…[truncated]`
      : value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') return value;

  if (typeof value === 'bigint') return value.toString();

  if (value instanceof Date) return value.toISOString();

  if (Buffer.isBuffer(value)) return `[Buffer ${value.length} bytes]`;

  if (depth >= MAX_DEPTH) return '[MAX_DEPTH]';

  if (Array.isArray(value)) {
    const items = value.slice(0, MAX_ARRAY_LENGTH).map((item) => sanitizeForLog(item, depth + 1));
    if (value.length > MAX_ARRAY_LENGTH) {
      items.push(`…[${value.length - MAX_ARRAY_LENGTH} more]`);
    }
    return items;
  }

  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      result[key] = SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : sanitizeForLog(item, depth + 1);
    }
    return result;
  }

  // 函数、symbol 等不可序列化类型不落日志
  return undefined;
}
