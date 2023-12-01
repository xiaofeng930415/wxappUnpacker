const fs = require('fs');
const { getFilesSync, getFilesPattern } = require('./utils.js');

function doDel(base_path) {
  
  // 删除多余文件 已经完成
  let del_files_pattern = '{pages,components}/**/*.{appservice,common,webview}.js';
  del_files_pattern = getFilesPattern(base_path, del_files_pattern);
  console.log("del_files_pattern", del_files_pattern);
  const res = getFilesSync(del_files_pattern);

  console.log("开始删除文件", del_files_pattern);
  // .then((res) => {
  console.log('====================================');
  console.log(res);
  console.log('====================================');
  res.map((item) => {
    fs.unlink(item, (err) => {
      if (err) throw err;
    });
  });
}


module.exports = { doDel: doDel };

if (require.main === module) {
  doDel('Z:/GitStore/zy_mp/app');
}