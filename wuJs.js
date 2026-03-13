const wu = require("./wuLib.js");
const path = require("path");
const UglifyJS = require("uglify-es");
const {js_beautify} = require("js-beautify");
const {VM} = require('vm2');

/**
 * 通过 uglify-es 的 beautify 选项格式化 JS。
 * @param {string} code 原始 JS 代码。
 * @returns {string} 格式化后的 JS 字符串。
 */
function jsBeautify(code) {
    return UglifyJS.minify(code, {mangle: false, compress: false, output: {beautify: true, comments: true}}).code;
}

/**
 * 拆分 app-service/appservice/workers 这类打包 JS，并回写为独立源码文件。
 * @param {string} name 待拆分 JS 文件路径。
 * @param {Function} cb 拆分完成回调，参数为删除权重映射。
 * @param {string} [mainDir] 分包输出目录。
 * @returns {void}
 */
function splitJs(name, cb, mainDir) {
    let isSubPkg = mainDir && mainDir.length > 0;
    let dir = path.dirname(name);
    if (isSubPkg) {
        dir = mainDir;
    }
    // 读取为 Buffer，避免任何编码层面的字符解释（如反斜杠转义）
    wu.get(name, codeBuf => {
        let code = Buffer.isBuffer(codeBuf) ? codeBuf.toString('utf8') : codeBuf;
        debugger;
        let needDelList = {};
        const vmDefine = function (name, func) {
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
            debugger;
            needDelList[path.resolve(dir, name)] = -8;
            wu.save(path.resolve(dir, name), jsBeautify(res));
        };
        const vmRequire = function () {
        };
        let vm = new VM({
            sandbox: {
                require: vmRequire,
                define: vmDefine,
                __g() {},
                __vd_version_info__: {},
                __wxAppCode__: {},
                definePlugin(name, factory) {
                    const module = { exports: {} };
                    const exports = module.exports;
                    const mockGlobal = {
                        __wxAppCode__: {},
                        __wxCodeSpace__: {},
                        publishDomainComponents: function() {}
                    };
                    const mockWx = {};
                    const mockApp = function() {};
                    const mockPage = function() {};
                    const mockComponent = function() {};
                    const mockBehavior = function() {};
                    const mockGetApp = function() {};
                    const mockGetCurrentPages = function() {};
                    const mockConsole = { log: console.log, warn: console.warn, error: console.error };
                    const mockRequireMiniProgram = function() {};
                    const mockWXWebAssembly = {};
                    const mockWxCodeSpace = {};
                    factory(vmDefine, vmRequire, module, exports, mockGlobal, mockWx, mockApp, mockPage, mockComponent, mockBehavior, mockGetApp, mockGetCurrentPages, mockConsole, mockRequireMiniProgram, mockWXWebAssembly, mockWxCodeSpace);
                },
                requirePlugin() {
                }
            }
        });
        if (isSubPkg) {
            code = code.slice(code.indexOf("define("));
        }
        
        console.log('splitJs: ' + name);
        // ToFixed TypeError [Error]: $gstack is not a function
        code = code.replace('e.stack = $gstack(e.stack);', '');
        debugger;
        try {
            vm.run(code);
        } catch (e) {
            console.log("Fail to run \"" + name + "\".");
            console.log(e);
            debugger;
            throw e;
        }
        console.log("Splitting \"" + name + "\" done.");
        if (!needDelList[name]) needDelList[name] = 8;
        cb(needDelList);
    }, { encoding: null });
}

module.exports = {jsBeautify: jsBeautify, wxsBeautify: js_beautify, splitJs: splitJs};
if (require.main === module) {
    wu.commandExecute(splitJs, "Split and beautify weapp js file.\n\n<files...>\n\n<files...> js files to split and beautify.");
}
