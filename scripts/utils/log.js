/**
 * 脚本日志工具
 *
 * 模板内置的最小实现，避免为了几行彩色输出依赖团队私有包。
 * 支持 `NO_COLOR` 与非 TTY 环境自动降级为纯文本。
 */

const COLOR = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  gray: '\x1b[90m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

const useColor = process.env.NO_COLOR === undefined && process.stdout.isTTY === true;

const paint = (text, color) => (useColor ? `${COLOR[color]}${text}${COLOR.reset}` : text);

/** 类型 → [标记, 颜色] */
const TAGS = {
  success: ['✔', 'green'],
  error: ['✖', 'red'],
  warning: ['▲', 'yellow'],
  warn: ['▲', 'yellow'],
  info: ['ℹ', 'blue'],
  deploy: ['↗', 'magenta'],
  build: ['⚙', 'cyan'],
  clean: ['⌫', 'gray'],
  copy: ['⧉', 'cyan'],
  check: ['✓', 'blue'],
};

/**
 * 输出一行带类型标记的日志
 * @param {string} message 内容
 * @param {keyof typeof TAGS} [type] 类型
 */
export const log = (message = '', type = 'info') => {
  const [mark, color] = TAGS[type] ?? TAGS.info;
  console.log(`${paint(mark, color)} ${message}`);
};

/** 输出分隔线 */
export const separator = (char = '─', length = 50) => {
  console.log(paint(char.repeat(length), 'gray'));
};

/** 输出标题横幅 */
export const showBanner = (title) => {
  console.log();
  console.log(paint(` ${title} `, 'bold'));
  separator('═', 50);
};

/** 输出成功提示 */
export const showSuccess = (message) => log(message, 'success');

/**
 * 统一错误出口：打印错误并退出进程
 * @param {string} message 说明
 * @param {unknown} [error] 原始错误
 */
export const handleError = (message, error) => {
  console.error(paint(`✖ ${message}`, 'red'));
  if (error !== undefined) {
    console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
  }
  process.exit(1);
};
