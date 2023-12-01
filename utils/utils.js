const { exec } = require('child_process');

function execCmd(commands = []) {
    // const cards = await jiraData.getCardsInTest();
    // let commands = ['cd /home/me/repo', 'pwd'];
    let proceeding = true;
    // for (const card of cards) {
    //     commands.push(`git merge origin/${card} --commit --no-edit`);
    // }

    for (const command of commands) {
        if (proceeding) {
            console.log(`Executing command "${command}"`);
            exec(command, (err, stdout, stderr) => {
                if (err) {
                    proceeding = false;
                    console.log(stderr);
                    return;
                }
                console.log(stdout);
            });
        }
    }
};


/* eslint-disable no-undef */
const path = require("path");
const fs = require("fs");
const {
  glob,
  globSync,
  // globStream,
  // globStreamSync,
  // Glob,
} = require("glob");

async function getFiles(pattern = "**/*.*", options) {
  const files = await glob(pattern, { ignore: "node_modules/**", ...options });
  debugger;
  return files;
}
function getFilesSync(pattern = "**/*.*", options) {
  const files = globSync(pattern, { ignore: "node_modules/**", ...options });
  return files;
}

function getFilesSyncCheck(pattern = "**/*.*", options) {
  const {callback, ...rest} = options;
  const files = globSync(pattern, { ignore: "node_modules/**", ...rest }).filter(filepath => {
    return typeof callback === 'function' ? callback(filepath) : true;
  });
  return files;
}


function write(content, _path, isFill = false) {
  // const _filename = filename || '日志_' + new Date().getTime() + '.txt';
  // const _path = path.join(__dirname, `${_filename}`);

  const { dir } = path.parse(_path);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  if (fs.existsSync(_path) && isFill) {
    console.info(_path + "文件已存在");
    return Promise.resolve();
  }
  // try {
  // 	console.log('dir: ', dir);
  // 	fs.mkdirSync(dir);

  // } catch (error) {
  // 	console.error(error);
  // }

  return new Promise((resolve, reject) => {
    fs.writeFile(_path, content, (err, doc) => {
      if (err != null) {
        console.error(err);
        return reject(err);
      }
      console.info(_path + "写入成功");
      return resolve();
    });
  });
}


function writeSync(content, _path, isFill = false) {

  const { dir } = path.parse(_path);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  if (fs.existsSync(_path) && isFill) {
    console.info(_path + "文件已存在");
    return true;
  }

  return fs.writeFileSync(_path, content, { encoding: 'utf-8' });
}

function read(_path) {
  // const _path = path.join(filename);

  return new Promise((resolve, reject) => {
    fs.readFile(_path, (err, doc) => {
      if (err != null) {
        console.error(err);
        return reject(err);
      }
      return resolve(doc);
    });
  });
}
function readSync(_path) {
  // const _path = path.join(filename);
  return fs.readFileSync(_path, { encoding: 'utf-8' });
}

function findTheEnd({
  str,
  prefix = "if(path&&e_[path]){",
  start = "{",
  end = "}",
}) {
  if (!str.includes(prefix)) {
    return str;
  }
  const str_list = str.split(prefix);

  function findTheEndCore(str, start, end) {
    let [startNum, endNum] = [1, 0];
    let _str = str;
    for (let i = 0; i < str.length; i++) {
      let temp = str[i];
      if (temp === start) {
        startNum += 1;
      } else if (temp === end) {
        endNum += 1;
      }
      if (startNum === endNum) {
        _str = str.slice(i + 1);
        break;
      }
    }
    return _str;
  }
  const [str_list_0, ...str_list_rest] = str_list;
  const _str_list = [
    str_list_0,
    ...str_list_rest.map((item) => {
      return findTheEndCore(item, start, end);
    }),
  ];
  return _str_list.join("");
}

function transfromRequireName(str, prefix = "common/") {
  const patt =
    /(?<=[A-Za-z]+\(('|"))[A-Za-z0-9]+(?=('|")\)[\.default|\["default"\]]*)/;
  const match_str = str.match(patt)?.find(Boolean);
  if (match_str) {
    str = str.replace(match_str, prefix + match_str); // .replace(".default", "");
  }
  return str;
}

function getFilesPattern(base_path = '', files_pattern = '') {
  base_path = path.join(base_path).split("\\").join("/");
  files_pattern = files_pattern.map
    ? files_pattern.map((item) => `${base_path}/${item}`)
    : `${base_path}/${files_pattern}`;
  console.log("files_pattern", files_pattern);
  return files_pattern;
}

module.exports = {
  write,
  writeSync,
  read,
  readSync,
  findTheEnd,
  getFiles,
  getFilesSync,
  getFilesSyncCheck,
  getFilesPattern,
  transfromRequireName,
  execCmd
};
// export default module.exports;
