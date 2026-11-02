/**
 * 文件上传的安全拒绝名单
 *
 * 背景：上传目录由同一进程以静态资源方式对外提供（`NEST_STATIC_ASSETS_DIR`），
 * 浏览器会按扩展名决定 `Content-Type`。若允许 `text/html` / `image/svg+xml` /
 * `application/javascript` 落盘，攻击者可上传带脚本的文件并诱导他人同源打开，
 * 形成存储型 XSS（可读取同源 Cookie / localStorage、以受害者身份调用 API）。
 *
 * 因此这里维护一份「无论白名单如何配置都拒绝」的类型与扩展名集合：
 * - MIME 名单在 Multer 解析期（fileFilter）与落盘前（resolveFileType）各校验一次；
 * - 扩展名名单用于兜住 `file-type` 无法探测 magic number 的文本类型
 *   （HTML / SVG / JS / XML 都属于此类，扩展名由声明的 MIME 反查得到）。
 *
 * 需要放开时不要删除本名单，而应把文件放到独立域名/独立源，并强制
 * `Content-Disposition: attachment` 后再评估风险。
 */

/** 永久拒绝的 MIME 类型 */
export const BLOCKED_UPLOAD_MIME_TYPES: ReadonlySet<string> = new Set([
  'text/html',
  'application/xhtml+xml',
  'image/svg+xml',
  'application/javascript',
  'text/javascript',
  'application/x-javascript',
  'text/xml',
  'application/xml',
  'application/x-shockwave-flash',
]);

/** 永久拒绝的落盘扩展名（小写、不含点） */
export const BLOCKED_UPLOAD_EXTENSIONS: ReadonlySet<string> = new Set([
  'html',
  'htm',
  'xhtml',
  'shtml',
  'svg',
  'svgz',
  'js',
  'mjs',
  'xml',
  'xsl',
  'xslt',
  'swf',
]);

/**
 * 判断 MIME 类型是否被永久拒绝
 * @param mime 客户端声明或内容探测得到的 MIME
 * @returns 命中拒绝名单返回 true
 */
export function isBlockedUploadMime(mime: string): boolean {
  return BLOCKED_UPLOAD_MIME_TYPES.has(mime.toLowerCase().split(';')[0].trim());
}

/**
 * 判断扩展名是否被永久拒绝
 * @param extension 扩展名（不含点，大小写不敏感）
 * @returns 命中拒绝名单返回 true
 */
export function isBlockedUploadExtension(extension: string): boolean {
  return BLOCKED_UPLOAD_EXTENSIONS.has(extension.toLowerCase().replace(/^\./, ''));
}
