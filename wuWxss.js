const wu = require("./wuLib.js");
const { doAppWxss } = require("./wxss/index.js");
const path = require("path");
const fs = require("fs");
const {VM} = require('vm2');
const cssbeautify = require('cssbeautify');
const csstree = require('css-tree');
const cheerio = require('cheerio');

function write(content, filename) {
    const _filename = filename || new Date().getTime() + '.txt';
    const _path = path.join(__dirname, `日志_${_filename}`);
    fs.writeFileSync(_path, content);
    // ,(err, doc) => {
    //     if(err != null){
    //         console.error(err);
    //         return false;
    //     }
    //     // console.log('文件成功写入了！');
    // })
}

function doWxss(dir, cb, mainDir, nowDir) {
    let saveDir = dir;
    let isSubPkg = mainDir && mainDir.length > 0;
    if (isSubPkg) {
        saveDir = mainDir
    }

    function GwxCfg() {
    }

    GwxCfg.prototype = {
        $gwx() {
        }
    };
    for (let i = 0; i < 300; i++) GwxCfg.prototype["$gwx" + i] = GwxCfg.prototype.$gwx;
    let runList = {}, pureData = {}, result = {}, actualPure = {}, importCnt = {}, frameName = "", onlyTest = true,
        blockCss = [];//custom block css file which won't be imported by others.(no extension name)
        let commonStyle = {};//some global css
    function cssRebuild(data) {//need to bind this as {cssFile:__name__} before call
		let cssFile;

        function statistic(data) {
            function addStat(id) {
                if (!importCnt[id]) importCnt[id] = 1, statistic(pureData[id]);
				else ++importCnt[id];
			}

            if (typeof data === "number") return addStat(data);  
            if (data != undefined) {
                for (let content of data) if (typeof content === "object" && content[0] == 2) addStat(content[1]);
            }
        }

        function makeup(data) {
            var isPure = typeof data === "number";
            if (onlyTest) {
				statistic(data);
                if (!isPure) {
                    if (data.length == 1 && data[0][0] == 2) data = data[0][1];
					else return "";
				}
                if (!actualPure[data] && !blockCss.includes(wu.changeExt(wu.toDir(cssFile, frameName), ""))) {
                    console.log("Regard " + cssFile + " as pure import file.");
                    actualPure[data] = cssFile;
				}
				return "";
			}
            let res = [], attach = "";
            if (isPure && actualPure[data] != cssFile) {
                if (actualPure[data]) return '@import "' + wu.changeExt(wu.toDir(actualPure[data], cssFile), ".wxss") + '";\n';
                else {
                    res.push("/*! Import by _C[" + data + "], whose real path we cannot found. */");
                    attach = "/*! Import end */";
				}
			}
            let exactData = isPure ? pureData[data] : data;
            if (typeof data === 'string') {
              let styleData = commonStyle[data]
              let fileStyle = ''
              if (styleData != undefined) {
                for (let content of styleData) {
                  if (typeof content === 'string') {
                    if (content != '1') {
                      fileStyle += content
                    }
                  } else {
                    if (content.length != 1) {
                      fileStyle += content[1] + 'rpx'
                    }
                  }
                }
              }
              exactData = fileStyle
            }
            for (let content of exactData)
                if (typeof content === "object") {
                    switch (content[0]) {
                        case 0://rpx
                            res.push(content[1] + "rpx");
                            break;
                        case 1://add suffix, ignore it for restoring correct!
                            break;
                        case 2://import
                            res.push(makeup(content[1]));
                            break;
					}
                } else res.push(content);
            return res.join("") + attach;
        }

        return () => {
            cssFile = this.cssFile;
            if (!result[cssFile]) result[cssFile] = "";
            result[cssFile] += makeup(data);
		};
	}

    function runVM(name, code) {
        let wxAppCode = {}, handle = {cssFile: name};
        let vm = new VM({
            sandbox: Object.assign(new GwxCfg(), {
                __wxAppCode__: wxAppCode,
                setCssToHead: cssRebuild.bind(handle),
                $gwx(path, global) {

                }
            })
        });
        if (name.includes("app")) {
            write(code, "appWxss.js");
        }


        console.log('do css runVm: ' + name);
        let flag = false;
        try {
            // ToFixed TypeError [Error]: $gstack is not a function
            code = code.replace('e.stack = $gstack(e.stack);', '');
            vm.run(code);
            flag = true;
        } catch (error) {
            console.log('【error】', error);
            console.log('===========================');
            console.log('转化失败,尝试用新方式进行转化');
        }
        if(!flag){
            let _code = doAppWxss(code);
            try {
                vm.run(_code);
                flag = true;
            } catch (error) {
                console.log('【error】', error);
                console.log('===========================');
                console.log('转化失败,尝试用新方式进行转化失败');
            }
        }

        if(flag){
            for (let name in wxAppCode) {
                handle.cssFile = path.resolve(saveDir, name);
                if (name.endsWith(".wxss")) {
                    wxAppCode[name]();
                }
            }
        }
    }

    function preRun(dir, frameFile, mainCode, files, cb) {
		wu.addIO(cb);

        runList[path.resolve(dir, "./app.wxss")] = mainCode;

        for (let name of files) {
            if (name != frameFile) {
                wu.get(name, codeBuf => {
                    let code = Buffer.isBuffer(codeBuf) ? codeBuf.toString('utf8') : codeBuf;
                    code = code.replace(/display:-webkit-box;display:-webkit-flex;/gm, '');
                    code = code.slice(0, code.indexOf("\n"));
                    if (code.indexOf("setCssToHead(") > -1) {
                        let lastName = name;
                        let dirSplit = name.split(nowDir + '/');
                        if (dirSplit.length > 1) {
                            lastName = path.resolve(saveDir, dirSplit[1]);
                        }
                        runList[lastName] = code.slice(code.indexOf("setCssToHead("));
                    }
                }, { encoding: null });
            }
        }
    }

    function runOnce() {
        for (let name in runList) runVM(name, runList[name]);
    }

    function transformCss(style) {
        let ast = csstree.parse(style);
        csstree.walk(ast, function (node) {
            if (node.type == "Comment") {//Change the comment because the limit of css-tree
                node.type = "Raw";
                node.value = "\n/*" + node.value + "*/\n";
			}
            if (node.type == "TypeSelector") {
                if (node.name.startsWith("wx-")) node.name = node.name.slice(3);
                else if (node.name == "body") node.name = "page";
			}
            if (node.children) {
                const removeType = ["webkit", "moz", "ms", "o"];
                let list = {};
                node.children.each((son, item) => {
                    if (son.type == "Declaration") {
                        if (list[son.property]) {
                            let a = item, b = list[son.property], x = son, y = b.data, ans = null;
                            if (x.value.type == 'Raw' && x.value.value.startsWith("progid:DXImageTransform")) {
								node.children.remove(a);
                                ans = b;
                            } else if (y.value.type == 'Raw' && y.value.value.startsWith("progid:DXImageTransform")) {
								node.children.remove(b);
                                ans = a;
                            } else {
                                let xValue = x.value.children && x.value.children.head && x.value.children.head.data.name,
                                    yValue = y.value.children && y.value.children.head && y.value.children.head.data.name;
                                if (xValue && yValue) for (let type of removeType) if (xValue == `-${type}-${yValue}`) {
									node.children.remove(a);
                                    ans = b;
									break;
                                } else if (yValue == `-${type}-${xValue}`) {
									node.children.remove(b);
                                    ans = a;
									break;
                                } else {
                                    let mValue = `-${type}-`;
                                    if (xValue.startsWith(mValue)) xValue = xValue.slice(mValue.length);
                                    if (yValue.startsWith(mValue)) yValue = yValue.slice(mValue.length);
								}
                                if (ans === null) ans = b;
							}
                            list[son.property] = ans;
                        } else list[son.property] = item;
					}
				});
                for (let name in list) if (!name.startsWith('-'))
                    for (let type of removeType) {
                        let fullName = `-${type}-${name}`;
                        if (list[fullName]) {
							node.children.remove(list[fullName]);
							delete list[fullName];
						}
					}
			}
		});
        return cssbeautify(csstree.generate(ast), {indent: '    ', autosemicolon: true});
    }

    wu.scanDirByExt(dir, ".html", files => {
        let frameFile = "";
        if (fs.existsSync(path.resolve(dir, "page-frame.html")))
            frameFile = path.resolve(dir, "page-frame.html");
        else if (fs.existsSync(path.resolve(dir, "app-wxss.js")))
            frameFile = path.resolve(dir, "app-wxss.js");
        else if (fs.existsSync(path.resolve(dir, "page-frame.js")))
            frameFile = path.resolve(dir, "page-frame.js");
        else if (fs.existsSync(path.resolve(dir, "pageframe.js")))
            frameFile = path.resolve(dir, "pageframe.js");
		else throw Error("page-frame-like file is not found in the package by auto.");

        wu.get(frameFile, codeBuf => {
            let code = Buffer.isBuffer(codeBuf) ? codeBuf.toString('utf8') : codeBuf;
            code = code.replace(/display:-webkit-box;display:-webkit-flex;/gm, '');
            let scriptCode = code;
            write(scriptCode, 'scriptCode.js');
            //extract script content from html
            let isMatch = true;
            if (frameFile.endsWith(".html")) {
                // let reg = /var __pageFrameStartTime__=Date\.now\(\);(\n|\r|.)*var __pageFrameEndTime__=Date\.now\(\);/
                // let list = scriptCode.match(reg)
                // if(list?.[0]){
                //     scriptCode = list[0];
                //     isMatch =  true;
                //     write(scriptCode, 'scriptCode2.js');
                // }else {
                    try {
                        const $ = cheerio.load(code);
                        scriptCode = [].join.apply($('html').find('script').map(function (item) {
                            return $(this).html();
                        }, "\n"));
                        write(scriptCode, 'scriptCode2.js');
                    } catch (e) {
                        //ignore
                    }
                // }
            }

            let window = {
                screen: {
                    width: 720,
                    height: 1028,
                    orientation: {
                        type: 'vertical'
                    }
                }
            };
            let navigator = {
                userAgent: "iPhone"
            };

            let index = scriptCode.lastIndexOf('window.__wcc_version__');
            if(index === -1){
                // scriptCode = scriptCode.slice(scriptCode.lastIndexOf('__globalThis.__wcc_version__'));
                // scriptCode = scriptCode.slice(scriptCode.lastIndexOf('var __globalThis='));
                index = scriptCode.lastIndexOf('var __globalThis=');
                scriptCode = scriptCode.slice(index);

                const [ g_start, g_end ] = ['if(this&&this.__g===undefined)', 'Object.freeze(__g);'];
                const g = code.slice(code.indexOf(g_start), code.indexOf(g_end) + g_end.length);

                write(g, 'g.js');
                scriptCode = g + scriptCode;
            } else {
                scriptCode = scriptCode.slice(index);
                if(isMatch){
                    // scriptCode = "(function(){" + scriptCode; // .replace(" })(); ", '');
                    // scriptCode = scriptCode.replace("})();     var __pluginFrameEndTime_wx4d2deeab3aed6e5a__", 'var __pluginFrameEndTime_wx4d2deeab3aed6e5a__');
                    scriptCode = scriptCode.replace(/\}\)\(\);\s*var __pluginFrameEndTime_/, 'var __pluginFrameEndTime_');
                }
            }

            write(scriptCode, 'scriptCode3.js');
            let mainCode = 'window= ' + JSON.stringify(window) +
            // let mainCode = 'Object.assign(window, ' + JSON.stringify(window) + ')' +
                ';\nnavigator=' + JSON.stringify(navigator) +
                ';\nvar __mainPageFrameReady__ = window.__mainPageFrameReady__ || function(){};var __WXML_GLOBAL__={entrys:{},defines:{},modules:{},ops:[],wxs_nf_init:undefined,total_ops:0};var __vd_version_info__=__vd_version_info__||{}' +
                `;\nvar __globalThis = (typeof __vd_version_info__ !== 'undefined' && typeof __vd_version_info__.globalThis !== 'undefined') ? __vd_version_info__.globalThis : window;` +
                `;\nvar __g = {}` +
                ";\n" + scriptCode;

                if (code.indexOf('__COMMON_STYLESHEETS__') != -1) {
                  let commonStyles = code.slice(
                    code.indexOf('__COMMON_STYLESHEETS__||{}') + 26,
                    code.indexOf(
                      'var setCssToHead = function(file, _xcInvalid, info)'
                    )
                  )
                  commonStyles =
                    ';var __COMMON_STYLESHEETS__ = __COMMON_STYLESHEETS__||{};' +
                    commonStyles +
                    ';__COMMON_STYLESHEETS__;'
                    try {
                        commonStyle = new VM().run(commonStyles)
                    } catch (error) {
                        commonStyle = {}
                        // write(commonStyles, 'commonStyles.js')
                        // 暂时不管这里，设置其为正常流程
                        // throw new Error(error)
                    }
                }

            // remove setCssToHead side-effects in mainCode
            mainCode = mainCode.replace('var setCssToHead = function', 'var setCssToHead2 = function');

            code = code.slice(code.lastIndexOf('var setCssToHead = function(file, _xcInvalid'));
            code = code.replace('__COMMON_STYLESHEETS__', '[]');
            
            if (code.indexOf('_C =') == -1) {
                code = code.slice(code.lastIndexOf('\nvar _C= ') + 1);
            } else {
                code = code.slice(code.lastIndexOf('\nvar _C = ') + 1);
            }

            code = code.slice(0, code.indexOf('\n'));
            let vm = new VM({sandbox: {}});
            pureData = vm.run(code + "\n_C");
            write(JSON.stringify(pureData), 'pureData.txt');

            console.log("Guess wxss(first turn)...");
            // write(scriptCode, 'scriptCode4.js');
            preRun(dir, frameFile, mainCode, files, () => {
                console.info("dir, frameFile, mainCode, files")
                write(mainCode, "mainCode.js")
                write(frameFile, "frameFile.txt")
                console.info(dir)
                console.info(files)
                frameName = frameFile;
                onlyTest = true;
				runOnce();
                onlyTest = false;
                console.log("Import count info: %j", importCnt);
                for (let id in pureData) if (!actualPure[id]) {
                    if (!importCnt[id]) importCnt[id] = 0;
                    if (importCnt[id] <= 1) {
                        console.log("Cannot find pure import for _C[" + id + "] which is only imported " + importCnt[id] + " times. Let importing become copying.");
                    } else {
                        let newFile = path.resolve(saveDir, "__wuBaseWxss__/" + id + ".wxss");
                        console.log("Cannot find pure import for _C[" + id + "], force to save it in (" + newFile + ").");
                        id = Number.parseInt(id);
                        actualPure[id] = newFile;
                        cssRebuild.call({cssFile: newFile}, id)();
					}
				}
				console.log("Guess wxss(first turn) done.\nGenerate wxss(second turn)...");
				runOnce()
				console.log("Generate wxss(second turn) done.\nSave wxss...");

                console.log('saveDir: ' + saveDir);
                for (let name in result) {
                    let pathFile = path.resolve(saveDir, wu.changeExt(name, ".wxss"));
                    wu.save(pathFile, transformCss(result[name]));
                }
                let delFiles = {};
                for (let name of files) delFiles[name] = 8;
                delFiles[frameFile] = 4;
                // cb({})
				cb(delFiles); // mark 删除文件
			});
		}, { encoding: null });
	});
}

module.exports = {doWxss: doWxss};
if (require.main === module) {
    wu.commandExecute(doWxss, "Restore wxss files.\n\n<dirs...>\n\n<dirs...> restore wxss file from a unpacked directory(Have page-frame.html (or app-wxss.js) and other html file).");
}
