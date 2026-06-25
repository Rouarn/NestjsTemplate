/**
 * 深拷贝对象
 * （优先 structuredClone，失败自动降级）
 * @returns 深拷贝后的新对象
 * @param value
 */
export function deepClone<T>(value: T): T {
  // 1️⃣ 优先使用 Node 原生 structuredClone
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch {
      // structuredClone 失败（函数、特殊对象等）
    }
  }

  // 2️⃣ 降级到手写深拷贝
  return deepCloneFallback(value) as T;
}

/* ====================== fallback ====================== */

function deepCloneFallback(
  value: unknown,
  cache: WeakMap<object, unknown> = new WeakMap(),
): unknown {
  // 原始类型
  if (typeof value !== 'object' || value === null) {
    return value;
  }

  // 循环引用
  if (cache.has(value)) {
    return cache.get(value);
  }

  // Date
  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  // RegExp
  if (value instanceof RegExp) {
    return new RegExp(value.source, value.flags);
  }

  // Map
  if (value instanceof Map) {
    const result = new Map<unknown, unknown>();
    cache.set(value, result);
    value.forEach((v, k) => {
      result.set(deepCloneFallback(k, cache), deepCloneFallback(v, cache));
    });
    return result;
  }

  // Set
  if (value instanceof Set) {
    const result = new Set<unknown>();
    cache.set(value, result);
    value.forEach((v) => {
      result.add(deepCloneFallback(v, cache));
    });
    return result;
  }

  // Array
  if (Array.isArray(value)) {
    const input = value as unknown[];
    const result: unknown[] = new Array(input.length);
    cache.set(value as object, result);
    input.forEach((v, i) => {
      result[i] = deepCloneFallback(v, cache);
    });
    return result;
  }

  // Error（保留 message / name / stack）
  if (value instanceof Error) {
    const proto = Object.getPrototypeOf(value) as object;
    const errorCopy = Object.create(proto) as Error;
    errorCopy.message = value.message;
    errorCopy.name = value.name;
    errorCopy.stack = value.stack;
    cache.set(value, errorCopy);
    return errorCopy;
  }

  // 普通对象（包含 symbol）
  const result: Record<PropertyKey, unknown> = {};
  cache.set(value, result);

  Reflect.ownKeys(value).forEach((key) => {
    const src = value as Record<PropertyKey, unknown>;
    result[key] = deepCloneFallback(src[key], cache);
  });

  return result;
}
