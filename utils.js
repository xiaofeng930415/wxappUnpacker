/* eslint-disable no-undef */
const path = require("path");
const fs = require("fs");
const {
	glob,
	globSync,
	// globStream,
	// globStreamSync,
	// Glob,
} = require('glob');

async function getFiles(pattern = '**/*.*', options) {
  const files = await glob(pattern, { ignore: 'node_modules/**', ...options });
  return files;
}
function getFilesSync(pattern = '**/*.*', options) {
  const files = globSync(pattern, { ignore: 'node_modules/**', ...options });
  return files;
}

function write(content, _path) {
	// const _filename = filename || '日志_' + new Date().getTime() + '.txt';
	// const _path = path.join(__dirname, `${_filename}`);

	const { dir } = path.parse(_path);

	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir);
	}
	// try {
	// 	console.log('dir: ', dir);
	// 	fs.mkdirSync(dir);
		
	// } catch (error) {
	// 	console.error(error);
	// }

	return new Promise((resolve, reject) => {
		fs.writeFile(_path, content,(err, doc) => {
				if(err != null){
						console.error(err);
						return reject(err);
				}
				console.info(_path + '写入成功');
				return resolve();
		});
	});
}

function read(_path) {
	// const _path = path.join(filename);

	return new Promise((resolve, reject) => {
		fs.readFile(_path, (err, doc) => {
			if(err != null){
					console.error(err);
					return reject(err);
			}
			return resolve(doc);
		});
	});
}


function findTheEnd({str, prefix = 'if(path&&e_[path]){', start = '{', end = '}'}) {
  if(!str.includes(prefix)){
      return str;
  }
  const str_list = str.split(prefix);

  function findTheEndCore(str, start, end) {
      let [startNum, endNum] = [1, 0];
      let _str = str;
      for(let i = 0; i < str.length; i++){
          let temp = str[i];
          if(temp === start){
              startNum += 1;
          } else if(temp === end){
              endNum += 1;
          }
          if(startNum === endNum){
              _str = str.slice(i+1);
              break;
          }
      }
      return _str;
  }
  const [str_list_0, ...str_list_rest] = str_list;
  const _str_list = [str_list_0, ...str_list_rest.map(item => {
      return findTheEndCore(item, start, end);
  })];
  return _str_list.join('');
}

module.exports = {
	write,
	read,
	findTheEnd,
	getFiles,
	getFilesSync
}; 	
