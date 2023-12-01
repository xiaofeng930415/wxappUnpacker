const fs = require('fs');
const path = require('path');

function write(content, filename) {
  const _filename = filename || new Date().getTime() + '.txt';
  const _path = path.join(__dirname, `日志_${_filename}`);
  fs.writeFile(_path, content,(err, doc) => {
      if(err != null){
          console.error(err);
          return false;
      }
  })
}

function readSync(_path) {
  return fs.readFileSync(_path, { encoding: "utf-8" });
}

// 获取模板代码


function doAppWxss(code) {
  let list = [];
  let [reg1, reg2] = [/setCssToHead\(\["\.",\[1\],.*\}\)\(\);/, /__wxAppCode__\['.*\.wxss'\] = setCssToHead\(.*\);/g];

  let _list1 = code.match(reg1);
  if(_list1?.length){
    list.push(..._list1);
  }
  let _list2 = code.match(reg2);
  if(_list2?.length){
    list.push(..._list2);
  }
  
  const appWxssCodeModel = readSync(path.join(__dirname, '/mainCode.js'));
  let _code = appWxssCodeModel.replace('/* Replace Here */', list.join('\n'));
  write(_code, 'mainCodeNew.js');
  return _code;
}
module.exports = {doAppWxss: doAppWxss};