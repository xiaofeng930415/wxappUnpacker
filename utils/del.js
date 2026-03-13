const fs = require('fs');
const { getFilesSync, getFilesPattern } = require('./utils.js');

/**
 * 删除解包后可清理的中间文件并返回统计结果。
 * @param {string} base_path 解包输出根目录。
 * @returns {{basePath:string,matchedCount:number,deletedCount:number,failedCount:number,failed:Array}} 删除结果摘要。
 */
function doDel(base_path) {
  let del_files_pattern = [
    '**/**/{appservice,app-service,pageframe,page-frame,app-wxss}.js',
    '**/**/{pageframe,page-frame}.html',
    '**/**/*.{webview}.js',
    '**/**/*.html'
  ];
  del_files_pattern = getFilesPattern(base_path, del_files_pattern);
  console.log("del_files_pattern", del_files_pattern);
  const res = getFilesSync(del_files_pattern);

  console.log("开始删除文件", del_files_pattern);
  console.log('====================================');
  console.log(res);
  console.log('====================================');
  const failed = [];
  let deletedCount = 0;
  res.forEach((item) => {
    try {
      fs.unlinkSync(item);
      deletedCount += 1;
    } catch (err) {
      failed.push({
        file: item,
        reason: err && err.message ? err.message : String(err)
      });
      console.error(`删除文件失败: ${item}`, err);
    }
  });
  const summary = {
    basePath: base_path,
    matchedCount: res.length,
    deletedCount,
    failedCount: failed.length,
    failed
  };
  if (failed.length > 0) {
    throw new Error(`cleanup delete failed: ${JSON.stringify(summary)}`);
  }
  return summary;
}


module.exports = { doDel: doDel };

if (require.main === module) {
  doDel('Z:/GitStore/zy_mp/app');
}
