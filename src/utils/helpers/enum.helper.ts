/**
 * 枚举工具类
 *
 * 提供枚举操作的通用方法，包括键名获取、值获取、值检查等功能。
 */
export class EnumHelper {
  /**
   * 获取枚举的所有键名
   * @param enumObject 枚举对象
   * @returns 键名数组
   */
  static getKeys<T extends Record<string, string | number>>(enumObject: T): (keyof T)[] {
    return Object.keys(enumObject).filter((key) => isNaN(Number(key)));
  }

  /**
   * 获取枚举的所有值
   * @param enumObject 枚举对象
   * @returns 值数组
   */
  static getValues<T extends Record<string, string | number>>(enumObject: T): T[keyof T][] {
    return this.getKeys(enumObject).map((key) => enumObject[key]);
  }

  /**
   * 检查值是否存在于枚举中
   * @param enumObject 枚举对象
   * @param value 要检查的值
   * @returns 如果值存在则返回 true
   */
  static hasValue<T extends Record<string, string | number>>(
    enumObject: T,
    value: unknown,
  ): value is T[keyof T] {
    return this.getValues(enumObject).includes(value as T[keyof T]);
  }

  /**
   * 根据值获取对应的键名
   * @param enumObject 枚举对象
   * @param value 枚举值
   * @returns 对应的键名，如果不存在则返回 undefined
   */
  static getKeyByValue<T extends Record<string, string | number>>(
    enumObject: T,
    value: T[keyof T],
  ): keyof T | undefined {
    const entries = Object.entries(enumObject);
    const entry = entries.find(([, v]) => v === value);
    return entry ? entry[0] : undefined;
  }

  /**
   * 将枚举转换为选项数组
   * @param enumObject 枚举对象
   * @param labelMap 可选的标签映射
   * @returns 选项数组
   */
  static toOptions<T extends Record<string, string | number>>(
    enumObject: T,
    labelMap?: Partial<Record<T[keyof T], string>>,
  ): { value: T[keyof T]; label: string; key: keyof T }[] {
    return this.getKeys(enumObject).map((key) => ({
      value: enumObject[key],
      label: labelMap?.[enumObject[key]] ?? String(key),
      key,
    }));
  }
}
