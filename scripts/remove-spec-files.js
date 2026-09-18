/**
 * 测试文件清理脚本
 *
 * 递归删除项目中的所有 .spec.ts 测试文件
 */

import { handleError, log, separator, showBanner, showSuccess } from '@vakao-ui/scripts-utils';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 递归删除所有 .spec.ts 文件
 *
 * 遍历指定目录及其所有子目录，查找并删除 .spec.ts 测试文件
 * 包含完善的错误处理机制，确保单个文件删除失败不影响整体流程
 *
 * @param {string} dir - 要搜索的目录路径
 */
function removeSpecFiles(dir) {
  try {
    // 读取目录中的所有文件和子目录
    const files = fs.readdirSync(dir);

    files.forEach((file) => {
      const filePath = path.join(dir, file);

      try {
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          // 如果是目录，递归处理子目录
          // 跳过 node_modules 和 .git 等不需要处理的目录
          if (!['node_modules', '.git', 'dist', '.next', '.nuxt'].includes(file)) {
            removeSpecFiles(filePath);
          }
        } else if (file.endsWith('.spec.ts')) {
          // 如果是 .spec.ts 测试文件，删除它
          try {
            fs.unlinkSync(filePath);
            log(`已删除: ${filePath}`, 'clean');
          } catch (error) {
            log(`删除失败 ${filePath}: ${error.message}`, 'error');
          }
        }
      } catch (error) {
        // 处理单个文件状态检查失败的情况
        log(`无法访问 ${filePath}: ${error.message}`, 'warning');
      }
    });
  } catch (error) {
    // 处理目录读取失败的情况
    log(`读取目录失败 ${dir}: ${error.message}`, 'error');
  }
}

// -----------------------------------------------------------------------------
// 主执行逻辑
// -----------------------------------------------------------------------------

// 获取项目根目录的绝对路径
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

showBanner('NestJS 测试文件清理工具');
separator('─', 50);
log(`项目根目录: ${projectRoot}`, 'info');
log('开始搜索并删除所有 .spec.ts 文件...', 'clean');
separator('─', 50);

// 检查项目根目录是否存在
if (!fs.existsSync(projectRoot)) {
  handleError('项目根目录不存在', new Error('Project root missing'));
}

// 执行测试文件删除
try {
  removeSpecFiles(projectRoot);

  separator('─', 50);
  showSuccess('删除操作完成！');
  log('提示：', 'check');
  log(' - 此操作不可逆，如需恢复请从版本控制系统还原', 'check');
  log(' - 建议在删除前先提交代码到 Git', 'check');
  log(' - 如需重新生成测试文件，可使用 NestJS CLI', 'check');
} catch (error) {
  handleError('执行过程中发生未预期的错误', error);
}
