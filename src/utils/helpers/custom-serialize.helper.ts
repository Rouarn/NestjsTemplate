/**
 * 自定义可逆序列化工具
 * 目标：在使用 JSON 序列化/反序列化时保留特殊类型（Date、BigInt、Map、Set、Buffer）
 * 方法：为特殊值加上类型标记（__type），在反序列化阶段按标记还原
 * 使用：
 * - 序列化：serialize(obj) 替代 JSON.stringify
 * - 反序列化：deserialize<T>(str) 替代 JSON.parse
 * 注意：
 * - 该实现仅对明确的类型分支做处理，普通对象保持原样
 * - 反序列化后 Map/Set/Buffer 会恢复为对应运行时对象
 */
const TYPE_KEY = '__type';

/**
 * 带类型标记的序列化结构
 * 用于包装特殊类型在 JSON 中的表达
 */
type Tagged =
  | { __type: 'Date'; value: string }
  | { __type: 'BigInt'; value: string }
  | { __type: 'Map'; value: [unknown, unknown][] }
  | { __type: 'Set'; value: unknown[] }
  | { __type: 'Buffer'; value: string };

/**
 * 安全序列化入口
 * 等效于 JSON.stringify，但会对特殊类型打标记
 */
export function serialize(value: unknown): string {
  return JSON.stringify(value, replacer);
}

/**
 * 安全反序列化入口
 * 等效于 JSON.parse，但会恢复特殊类型到原始对象
 */
export function deserialize<T>(value: string): T {
  const out: unknown = JSON.parse(value, reviver);
  return out as T;
}

/* ===================== internal ===================== */

/**
 * JSON.stringify 的 replacer
 * 将特殊类型转换为带 __type 的可序列化对象
 */
function replacer(this: Record<string, unknown>, key: string, value: unknown): unknown {
  // 获取原始值，因为 Date.toJSON() 和 Buffer.toJSON() 会在 replacer 之前转换值
  const originalValue = this[key];

  // Date
  if (originalValue instanceof Date) {
    return {
      [TYPE_KEY]: 'Date',
      value: originalValue.toISOString(),
    } satisfies Tagged;
  }

  // BigInt
  if (typeof originalValue === 'bigint') {
    return {
      [TYPE_KEY]: 'BigInt',
      value: originalValue.toString(),
    } satisfies Tagged;
  }

  // Map
  if (originalValue instanceof Map) {
    return {
      [TYPE_KEY]: 'Map',
      value: Array.from(originalValue.entries()) as [unknown, unknown][],
    } satisfies Tagged;
  }

  // Set
  if (originalValue instanceof Set) {
    return {
      [TYPE_KEY]: 'Set',
      value: Array.from(originalValue.values()) as unknown[],
    } satisfies Tagged;
  }

  // Buffer (Node only)
  if (Buffer.isBuffer(originalValue)) {
    return {
      [TYPE_KEY]: 'Buffer',
      value: originalValue.toString('base64'),
    } satisfies Tagged;
  }

  return value;
}

/**
 * 判断对象是否为带类型标记的包装结构
 */
function isTagged(v: unknown): v is Tagged {
  if (!v || typeof v !== 'object') return false;
  const rec = v as Record<string, unknown>;
  const t = rec[TYPE_KEY];
  return t === 'Date' || t === 'BigInt' || t === 'Map' || t === 'Set' || t === 'Buffer';
}

/**
 * JSON.parse 的 reviver
 * 依据 __type 标记恢复为对应的运行时对象
 */
function reviver(_: string, value: unknown): unknown {
  if (!isTagged(value)) {
    return value;
  }
  const tagged = value;

  switch (tagged.__type) {
    case 'Date':
      return new Date(tagged.value);

    case 'BigInt':
      return BigInt(String(tagged.value));

    case 'Map':
      return new Map(tagged.value);

    case 'Set':
      return new Set(tagged.value);

    case 'Buffer':
      return Buffer.from(String(tagged.value), 'base64');

    default:
      return value;
  }
}
