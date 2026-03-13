const wu = require("./wuLib.js");
const wuJs = require("./wuJs.js");
const wuCfg = require("./wuConfig.js");
const wuMl = require("./wuWxml.js");
const wuSs = require("./wuWxss.js");
const path = require("path");
const del = require('./utils/del.js');

const fs = require("fs");

/**
 * 解析 wxapkg 头部并返回文件索引区与数据区长度。
 * @param {Buffer} buf 包头缓冲区，长度应为 14 字节。
 * @returns {[number, number]} [infoListLength, dataLength]
 */
function header(buf) {
    console.log("\nHeader info:");
    let firstMark = buf.readUInt8(0);
    console.log("  firstMark: 0x%s", firstMark.toString(16));
    let unknownInfo = buf.readUInt32BE(1);
    console.log("  unknownInfo: ", unknownInfo);
    let infoListLength = buf.readUInt32BE(5);
    console.log("  infoListLength: ", infoListLength);
    let dataLength = buf.readUInt32BE(9);
    console.log("  dataLength: ", dataLength);
    let lastMark = buf.readUInt8(13);
    console.log("  lastMark: 0x%s", lastMark.toString(16));

    console.log("  buf.length: ", buf.length);
    // 添加数据有效性检查
    // if (infoListLength <= 0 || infoListLength > buf.length || dataLength <= 0 || dataLength > buf.length) {
    //     throw Error("文件格式错误：数据长度无效");
    // }
    // 这个格式检查有问题，已调整
    if (infoListLength <= 0 || dataLength <= 0 ) {
        throw Error("文件格式错误：数据长度无效");
    }

    const VERSION_MAP = {
        0xbe: '标准包格式',
        0xce: '测试版格式', 
        0xae: '企业定制格式'
    };
    
    if (!VERSION_MAP[firstMark]) {
        console.warn('⚠️ 未知包格式: 0x%s (%s)', firstMark.toString(16), VERSION_MAP[firstMark] || '未识别版本');
    }
    
    if (firstMark != 0xbe || lastMark != 0xed) {
        console.warn('⚠️ 魔数校验未通过（预期 BE|ED，实际 %s|%s），继续尝试解包...', 
            firstMark.toString(16).padStart(2, '0').toUpperCase(),
            lastMark.toString(16).padStart(2, '0').toUpperCase());
    }

    return [infoListLength, dataLength];
}

/**
 * 从文件索引区生成解包文件列表。
 * @param {Buffer} buf 文件索引区缓冲区。
 * @returns {{name:string,off:number,size:number}[]} 解包条目列表。
 */
function genList(buf) {
    console.log("\nFile list info:");
    let fileCount = buf.readUInt32BE(0);
    console.log("  fileCount: ", fileCount);
    let fileInfo = [], off = 4;
    for (let i = 0; i < fileCount; i++) {
        let info = {};
        let nameLen = buf.readUInt32BE(off);
        off += 4;
        info.name = buf.toString('utf8', off, off + nameLen);
        off += nameLen;
        info.off = buf.readUInt32BE(off);
        off += 4;
        info.size = buf.readUInt32BE(off);
        off += 4;
        fileInfo.push(info);
    }
    return fileInfo;
}

/**
 * 将索引列表中的文件内容切片并写入目标目录。
 * @param {string} dir 输出目录。
 * @param {Buffer} buf 原始 wxapkg 全量缓冲区。
 * @param {{name:string,off:number,size:number}[]} list 文件索引列表。
 * @returns {void}
 */
function saveFile(dir, buf, list) {
    console.log("Saving files...");
    for (let info of list)
        wu.save(path.resolve(dir, (info.name.startsWith("/") ? "." : "") + info.name), buf.slice(info.off, info.off + info.size));
}

/**
 * 创建解包后清理调度器，支持主流程触发与 beforeExit 兜底触发。
 * @param {string} dir 解包输出目录。
 * @param {string[]} order 命令行选项集合（不含前导 -）。
 * @param {Function} doneCb 清理结束回调。
 * @returns {{trigger:(source:string)=>void,scheduleFallback:()=>void}}
 */
function createCleanupScheduler(dir, order, doneCb) {
    let cleaned = false;
    let fallbackListener = null;
    const optionState = {
        o: order.includes("o"),
        d: order.includes("d")
    };

    function logCleanup(stage, extra = {}) {
        const payload = Object.assign({
            stage,
            dir,
            options: optionState
        }, extra);
        console.log("[cleanup] " + JSON.stringify(payload));
    }

    function getSkipReason() {
        if (optionState.d) return "skip_by_option_d";
        if (optionState.o) return "skip_by_option_o";
        return "";
    }

    function trigger(source) {
        if (cleaned) {
            logCleanup("skip", { source, reason: "already_handled" });
            return;
        }
        if (fallbackListener) {
            process.removeListener("beforeExit", fallbackListener);
            fallbackListener = null;
        }
        cleaned = true;
        const skipReason = getSkipReason();
        if (skipReason) {
            logCleanup("skip", { source, reason: skipReason });
            doneCb?.();
            return;
        }
        logCleanup("triggered", { source });
        try {
            const result = del.doDel(dir);
            logCleanup("finished", {
                source,
                matchedCount: result.matchedCount,
                deletedCount: result.deletedCount
            });
        } catch (err) {
            logCleanup("failed", {
                source,
                reason: err?.message || String(err)
            });
            throw err;
        } finally {
            doneCb?.();
        }
    }

    return {
        trigger: trigger,
        scheduleFallback: function () {
            if (fallbackListener) return;
            fallbackListener = () => trigger("fallback");
            process.once("beforeExit", fallbackListener);
        }
    };
}

/**
 * 解包后编排恢复流程（配置、JS、WXML、WXSS）并聚合删除权重。
 * @param {string} dir 解包输出目录。
 * @param {Function} cb 完成回调。
 * @param {string[]} order 命令行选项集合（不含前导 -）。
 * @returns {void}
 */
function packDone(dir, cb, order) {
    console.log("Unpack done.");
    let weappEvent = new wu.CntEvent, needDelete = {};
    weappEvent.encount(4);
    weappEvent.add(() => {
        wu.addIO(() => {
            console.log("Split and make up done.");
            if (!order.includes("d")) {
                console.log("Delete files...");
                wu.addIO(() => console.log("Deleted.\n\nFile done."));
                for (let name in needDelete) if (needDelete[name] >= 8) wu.del(name);
            }
            cb();
        });
    });

    /**
     * 汇总各子处理器返回的可删除权重。
     * @param {Object<string, number>} deletable 文件删除权重映射。
     * @returns {void}
     */
    function doBack(deletable) {
        for (let key in deletable) {
            if (!needDelete[key]) needDelete[key] = 0;
            needDelete[key] += deletable[key];//all file have score bigger than 8 will be delete.
        }
        weappEvent.decount();
    }

    /**
     * 在候选文件中定位 page-frame 类入口并触发 WXML 还原。
     * @param {string[]} fileList 候选文件名列表。
     * @param {string} dir 当前工作目录。
     * @param {string} [mainDir] 分包输出目录。
     * @returns {boolean} 是否成功命中并处理。
     */
    function dealPageFrame(fileList, dir, mainDir) {
        for (const fileName of fileList) {
            const filePath = path.resolve(dir, fileName);
            if (fs.existsSync(filePath)) {
                wuMl.doFrame(filePath, doBack, order, mainDir);
                if (!needDelete[filePath]) {
                    needDelete[filePath] = 8;
                }
                console.log(`deal ${mainDir ? 'sub ' : ''}${fileName} ok`);
                return true;
            }
        }
        return false;
    }

    /**
     * 执行主恢复流程：配置恢复、JS 拆分、WXML/WXS 恢复、WXSS 恢复。
     * @param {string} dir 当前包目录。
     * @param {string} [mainDir] 分包归并目录。
     * @param {string} [nowDir] 当前遍历根目录（分包模式）。
     * @returns {void}
     */
    function dealThreeThings(dir, mainDir, nowDir) {
        console.log("Split app-service.js (or appservice.js) and make up configs & wxss & wxml & wxs...");

        //deal config
        if (fs.existsSync(path.resolve(dir, "app-config.json"))) {
            wuCfg.doConfig(path.resolve(dir, "app-config.json"), doBack);
            console.log('deal config ok');
        } else if (fs.existsSync(path.resolve(dir, "plugin.json"))) {
            wuCfg.doPluginConfig(path.resolve(dir, "plugin.json"));
            console.log('deal plugin config ok');
        }
        //deal js
        if (fs.existsSync(path.resolve(dir, "app-service.js"))) {
            wuJs.splitJs(path.resolve(dir, "app-service.js"), doBack, mainDir);
            console.log('deal js ok');
        } else if (fs.existsSync(path.resolve(dir, "appservice.js"))) {
            wuJs.splitJs(path.resolve(dir, "appservice.js"), doBack, mainDir);
            console.log('deal js ok');
        }
        if (fs.existsSync(path.resolve(dir, "workers.js"))) {
            wuJs.splitJs(path.resolve(dir, "workers.js"), doBack, mainDir);
            console.log('deal js2 ok');
        }
        //deal html
        const filesToCheck = ["page-frame.html", "pageframe.html", "page-frame.js", "pageframe.js", "app-wxss.js"];;
        
        if (!dealPageFrame(filesToCheck, dir, mainDir)) {
            throw Error("page-frame-like file is not found in the package by auto.");
        }
        
        if (mainDir) {
            wuSs.doWxss(dir, doBack, mainDir, nowDir);
        } else {
            //Force it run at last, becuase lots of error occured in this part
            wuSs.doWxss(dir, doBack);
            console.log('deal css ok');
        }

    }

    //This will be the only func running this time, so async is needless.
    if (fs.existsSync(path.resolve(dir, "app-service.js")) || fs.existsSync(path.resolve(dir, "appservice.js"))) {
        //weapp
        dealThreeThings(dir);
    } else if (fs.existsSync(path.resolve(dir, "game.js"))) {
        //wegame
        console.log("Split game.js and rewrite game.json...");
        let gameCfg = path.resolve(dir, "app-config.json");
        wu.get(gameCfg, cfgPlain => {
            let cfg = JSON.parse(cfgPlain);
            if (cfg.subContext) {
                console.log("Found subContext, splitting it...")
                delete cfg.subContext;
                let contextPath = path.resolve(dir, "subContext.js");
                wuJs.splitJs(contextPath, () => wu.del(contextPath));
            }
            wu.save(path.resolve(dir, "game.json"), JSON.stringify(cfg, null, 4));
            wu.del(gameCfg);
        });
        wuJs.splitJs(path.resolve(dir, "game.js"), () => {
            wu.addIO(() => {
                console.log("Split and rewrite done.");
                cb();
            });
        });
    } else {//分包
        let doSubPkg = false;
        for (const orderElement of order) {
            if (orderElement.indexOf('s=') !== -1) {
                let mainDir = orderElement.substring(2, orderElement.length);
                console.log("now dir: " + dir);
                console.log("param of mainDir: " + mainDir);

                /**
                 * 递归查找包含 app-service.js/appservice.js 的子包工作目录。
                 * @param {string} dir 当前遍历目录。
                 * @param {string} oldDir 原始主包目录参数。
                 * @returns {boolean|undefined}
                 */
                let findDir = function (dir, oldDir) {
                    let files = fs.readdirSync(dir);
                    for (const file of files) {
                        // 这里有两种情况，有可能是文件夹sub_pages，也有可能直接是文件,要区分
                        let tempPath = path.join(dir, file);
                        const stats = fs.statSync(tempPath);
                        let workDir = dir;
                        if(!stats.isFile()){
                            workDir = tempPath;
                        }
                        if (fs.existsSync(path.resolve(workDir, "app-service.js")) || fs.existsSync(path.resolve(workDir, "appservice.js"))) {
                            console.log("sub package word dir: " + workDir);
                            mainDir = path.resolve(oldDir, mainDir);
                            console.log("real mainDir: " + mainDir);
                            dealThreeThings(workDir, mainDir, oldDir);
                            doSubPkg = true;
                            return true;
                        } else {
                            if(workDir !== dir){ // 防止嵌套循环
                                findDir(workDir, oldDir);
                            }
                        }
                    }

                };

                findDir(dir, mainDir);

            }
        }
        if (!doSubPkg) {
            throw new Error("检测到此包是分包后的子包, 请通过 -s 参数指定存放路径后重试, 如 node wuWxapkg.js -s=/xxx/xxx ./testpkg/test-pkg-sub.wxapkg");
        }
    }
}

/**
 * 单个 wxapkg 文件解包入口。
 * @param {string} name wxapkg 文件路径。
 * @param {Function} cb 当前文件处理完成后的回调。
 * @param {string[]} order 命令行选项集合（不含前导 -）。
 * @returns {void}
 */
function doFile(name, cb, order) {
    // for (let ord of order) if (ord.startsWith("s=")) global.subPack = ord.slice(3);
    for (let ord of order) {
        if (ord.startsWith("s=")) {
            global.subPack = ord.slice(3);
        }
    }
    


    console.log("Unpack file " + name + "...");
    let dir = path.resolve(name, "..", path.basename(name, ".wxapkg"));
    const cleanupScheduler = createCleanupScheduler(dir, order, cb);
    const _cb = () => cleanupScheduler.trigger("main");

    wu.get(name, buf => {
        let [infoListLength, dataLength] = header(buf.slice(0, 14));
        if (order.includes("o")) wu.addIO(console.log.bind(console), "Unpack done.");
        else wu.addIO(packDone, dir, _cb, order);
        cleanupScheduler.scheduleFallback();
        saveFile(dir, buf, genList(buf.slice(14, infoListLength + 14)));
    }, { encoding: null });
}

module.exports = {doFile: doFile};
// 主入口
if (require.main === module) {
    wu.commandExecute(doFile, "Unpack a wxapkg file.\n\n[-o] [-d] [-s=<Main Dir>] [-t=miniapp|plugin] <files...>\n\n-d Do not delete transformed unpacked files.\n-o Do not execute any operation after unpack.\n-s=<Main Dir> Regard all packages provided as subPackages and\n              regard <Main Dir> as the directory of sources of the main package.\n-t=miniapp|plugin Set restore target type for WXML z-group matching.\n<files...> wxapkg files to unpack");
}
