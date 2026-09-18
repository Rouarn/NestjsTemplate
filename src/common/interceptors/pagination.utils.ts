/**
 * 提取根对象中的 message 字段
 * @param raw 任意对象
 * @returns 可选的字符串消息
 *
 * 说明：成功响应路径下 message 约定为 string；
 * string[]（多条校验提示）仅由异常过滤器处理，不在此透传。
 */
export function extractRootMessage(raw: unknown): string | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const msg = (raw as { message?: unknown }).message;
  return typeof msg === 'string' ? msg : undefined;
}

/**
 * 获取对象中的 data 字段
 * @param raw 任意对象
 * @returns data 字段的值（可能为 undefined）
 */
export function getInnerData(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return undefined;
  return (raw as { data?: unknown }).data;
}

/**
 * 从对象中抽取数组与总数，兼容 list/records/data 三种数组键
 * @param obj 任意对象
 * @returns { list, total } 或 null（无法识别时）
 */
export function pickListAndTotal<T>(obj: unknown): { list: T[]; total: number } | null {
  if (!obj || typeof obj !== 'object') return null;
  const anyObj = obj as { list?: unknown; records?: unknown; data?: unknown; total?: unknown };
  const fields = ['list', 'records', 'data'] as const;
  for (const key of fields) {
    if (Array.isArray(anyObj[key])) {
      return { list: anyObj[key] as T[], total: Number(anyObj.total ?? 0) };
    }
  }

  return null;
}

/**
 * 判断对象是否为分页载荷（根或包装结构）
 * @param raw 任意对象
 * @returns 是否可识别为分页数据
 */
export function isPaginatedPayload<T>(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return false;
  if (pickListAndTotal<T>(raw)) return true;
  const inner = getInnerData(raw);
  return !!pickListAndTotal<T>(inner);
}

/**
 * 归一化分页数据为 { list, total }
 * @param raw 任意对象（根或包装）
 * @returns 标准化的 { list, total }
 */
export function normalizePaginatedData<T>(raw: unknown): { list: T[]; total: number } {
  const root = pickListAndTotal<T>(raw);
  if (root) return root;
  const inner = getInnerData(raw);
  const normalized = pickListAndTotal<T>(inner);
  return normalized ?? { list: [], total: 0 };
}
