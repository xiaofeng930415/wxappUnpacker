const wu = require("./wuLib.js");
const path = require("path");
const UglifyJS = require("uglify-es");
const {js_beautify} = require("js-beautify");
const {VM} = require('vm2');

function jsBeautify(code) {
    return UglifyJS.minify(code, {mangle: false, compress: false, output: {beautify: true, comments: true}}).code;
}

function splitJs(name, cb, mainDir) {
    let isSubPkg = mainDir && mainDir.length > 0;
    let dir = path.dirname(name);
    if (isSubPkg) {
        dir = mainDir;
    }
    wu.get(name, code => {
        let needDelList = {};
        let vm = new VM({
            sandbox: {
                require() {
                },
                define(name, func) {
                    let code = func.toString();
                    code = code.slice(code.indexOf("{") + 1, code.lastIndexOf("}") - 1).trim();
                    let bcode = code;
                    if (code.startsWith('"use strict";') || code.startsWith("'use strict';")) code = code.slice(13);
                    else if ((code.startsWith('(function(){"use strict";') || code.startsWith("(function(){'use strict';")) && code.endsWith("})();")) code = code.slice(25, -5);
                    let res = jsBeautify(code);
                    if (typeof res == "undefined") {
                        console.log("Fail to delete 'use strict' in \"" + name + "\".");
                        res = jsBeautify(bcode);
                    }
                    console.log(dir, name);
                    needDelList[path.resolve(dir, name)] = -8;
                    wu.save(path.resolve(dir, name), jsBeautify(res));
                },
                // ReferenceError [Error]: $gwx is not defined
                // $gwx('init', global);
                $gwx() {},
                // 补充
                __g() {},
                __vd_version_info__: {},
                __wxAppCode__: {},
                // 补充
                definePlugin() {
                },
                requirePlugin() {
                }
            }
        });
        // 我怀疑是有些子包是独立子包,有些不是,也有可能就是提取代码有问题,不是正则模式当然会有问题
        // 解决方案1: 1直接移除,但其他子包有这个问题依然能跑
        // 解决方案2: 出现的问题是,{}不成对 采用
        if (isSubPkg) {
            const idx = code.indexOf("define(");
            if (idx !== -1) {
                const code2 = code.slice(idx);
                let leftCount = (code2.match(/\{/g) || []).length;
                let rightCount = (code2.match(/\}/g) || []).length;
                if (leftCount === rightCount) {
                    leftCount = (code2.match(/\(/g) || []).length;
                    rightCount = (code2.match(/\)/g) || []).length;
                    if (leftCount === rightCount) {
                        code = code2;
                    }
                }
            }
        }
        
        console.log('splitJs: ' + name);
        // ToFixed TypeError [Error]: $gstack is not a function
        code = code.replace('e.stack = $gstack(e.stack);', '');
        vm.run(code);
        console.log("Splitting \"" + name + "\" done.");
        if (!needDelList[name]) needDelList[name] = 8;
        cb(needDelList);
    });
}

module.exports = {jsBeautify: jsBeautify, wxsBeautify: js_beautify, splitJs: splitJs};
if (require.main === module) {
    wu.commandExecute(splitJs, "Split and beautify weapp js file.\n\n<files...>\n\n<files...> js files to split and beautify.");
}
