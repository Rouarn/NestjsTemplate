/**
 * 错误处理辅助函数
 */

/**
 * 安全地获取错误消息
 *
 * 处理 unknown 类型的 error 对象，确保返回字符串消息
 *
 * @param error 任意类型的错误对象
 * @param defaultMessage 默认错误消息
 * @returns 错误消息字符串
 */
export function getErrorMessage(error: unknown, defaultMessage = 'Unknown error'): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return (error as { message: string }).message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return defaultMessage;
  }
}
