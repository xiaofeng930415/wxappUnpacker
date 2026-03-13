const wu = require("./wuLib.js");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const {VM} = require('vm2');

/**
 * 从 workers.js 中解析公共 workers 目录。
 * @param {string} name workers.js 文件路径。
 * @returns {string|boolean} workers 公共目录，未命中时返回 false。
 */
function getWorkerPath(name) {
    let code = fs.readFileSync(name, {encoding: 'utf8'});
    let commPath = false;
    let vm = new VM({
        sandbox: {
            require() {
            },
            define(name) {
                name = path.dirname(name) + '/';
                if (commPath === false) commPath = name;
                commPath = wu.commonDir(commPath, name);
            }
        }
    });
    vm.run(code.slice(code.indexOf("define(")));
    if (commPath.length > 0) commPath = commPath.slice(0, -1);
    console.log("Worker path: \"" + commPath + "\"");
    return commPath;
}

/**
 * 解析 app-config.json 并拆分生成 app.json 与页面级 json 配置。
 * @param {string} configFile app-config.json 文件路径。
 * @param {(deletable:Object<string,number>)=>void} cb 完成回调。
 * @returns {void}
 */
function doConfig(configFile, cb) {
    let dir = path.dirname(configFile);
    wu.get(configFile, content => {
        let e = JSON.parse(content);
        let k = e.pages;
        k.splice(k.indexOf(wu.changeExt(e.entryPagePath)), 1);
        k.unshift(wu.changeExt(e.entryPagePath));
        let app = {pages: k, window: e.global && e.global.window, tabBar: e.tabBar, networkTimeout: e.networkTimeout};
        // 兼容附加的全局配置项，确保都写入到 app.json 根级
        if (e.useExtendedLib) app.useExtendedLib = e.useExtendedLib;
        if (e.plugins) app.plugins = e.plugins;
        if (e.embeddedAppIdList) app.embeddedAppIdList = e.embeddedAppIdList;
        if (e.renderer) app.renderer = e.renderer;
        if (e.componentFramework) app.componentFramework = e.componentFramework;
        if (e.subPackages) {
            let subPackages = [];
            let pages = app.pages;
            for (let subPackage of e.subPackages) {
                let root = subPackage.root;
                let lastChar = root.substr(root.length - 1, 1);
                if (lastChar !== '/') {
                    root = root + '/';
                }
                let firstChar = root.substr(0, 1);
                if (firstChar === '/') {
                    root = root.substring(1);
                }
                let newPages = [];
                if(subPackage.pages && Array.isArray(subPackage.pages)){
                    for (let page of subPackage.pages) {
                        let items = page.replace(root, '');
                        newPages.push(items);
                        let subIndex = pages.indexOf(root + items);
                        if (subIndex !== -1) {
                            pages.splice(subIndex, 1);
                        }
                    }
                }
                subPackage.root = root;
                subPackage.pages = newPages;
                subPackages.push(subPackage);
            }
            app.subPackages = subPackages;
            app.pages = pages;
            console.log("=======================================================\n这个小程序采用了分包\n子包个数为: ", app.subPackages.length, "\n=======================================================");
        }
        if (e.navigateToMiniProgramAppIdList) app.navigateToMiniProgramAppIdList = e.navigateToMiniProgramAppIdList;
        if (fs.existsSync(path.resolve(dir, "workers.js"))) app.workers = getWorkerPath(path.resolve(dir, "workers.js"));
        if (e.extAppid)
            wu.save(path.resolve(dir, 'ext.json'), JSON.stringify({
                extEnable: true,
                extAppid: e.extAppid,
                ext: e.ext
            }, null, 4));
        if (typeof e.debug != "undefined") app.debug = e.debug;
        let cur = path.resolve("./file");
        for (let a in e.page) if (e.page[a].window.usingComponents)
            for (let name in e.page[a].window.usingComponents) {
                let componentPath = e.page[a].window.usingComponents[name] + ".html";
                let file = componentPath.startsWith('/') ? componentPath.slice(1) : wu.toDir(path.resolve(path.dirname(a), componentPath), cur);
                if (!e.page[file]) e.page[file] = {};
                if (!e.page[file].window) e.page[file].window = {};
                e.page[file].window.component = true;
            }
        let appServicePath = path.resolve(dir, "app-service.js");
        if (!fs.existsSync(appServicePath)) {
            appServicePath = path.resolve(dir, "appservice.js");
        }
        if (fs.existsSync(appServicePath)) {
            let matches = fs.readFileSync(appServicePath, {encoding: 'utf8'}).match(/\_\_wxAppCode\_\_\['[^\.]+\.json[^;]+\;/g);
            if (matches) {
                let attachInfo = {};
                (new VM({
                    sandbox: {
                        __wxAppCode__: attachInfo
                    }
                })).run(matches.join(""));
                for (let name in attachInfo) e.page[wu.changeExt(name, ".html")] = { window: attachInfo[name] };
                // 若 app.json 在附加信息中声明了 usingComponents 等，也合并到 app 根级
                if (attachInfo["app.json"]) {
                    let appAttach = attachInfo["app.json"];
                    if (appAttach.usingComponents) app.usingComponents = appAttach.usingComponents;
                    if (appAttach.useExtendedLib && !app.useExtendedLib) app.useExtendedLib = appAttach.useExtendedLib;
                    if (appAttach.plugins && !app.plugins) app.plugins = appAttach.plugins;
                    if (appAttach.embeddedAppIdList && !app.embeddedAppIdList) app.embeddedAppIdList = appAttach.embeddedAppIdList;
                    if (appAttach.renderer && !app.renderer) app.renderer = appAttach.renderer;
                    if (appAttach.componentFramework && !app.componentFramework) app.componentFramework = appAttach.componentFramework;
                }
            }
        }
        let delWeight = 8;
        for (let a in e.page) {
            let fileName = path.resolve(dir, wu.changeExt(a, ".json"));
            wu.save(fileName, JSON.stringify(e.page[a].window, null, 4));
            if (configFile == fileName) delWeight = 0;
        }
        if (app.subPackages) {
            for (let subPackage of app.subPackages) {
                if (subPackage.pages) {
                    for (let item of subPackage.pages) {
                        let a = subPackage.root + item + '.xx';
                        //添加默认的 wxs, wxml, wxss
                        let jsName = wu.changeExt(a, ".js");
                        let fileNameOfWxs = path.resolve(dir, jsName);
                        wu.save(fileNameOfWxs, "// " + jsName + "\nPage({data: {}})");
                        let wxmlName = wu.changeExt(a, ".wxml");
                        let fileNameOfWxml = path.resolve(dir, wxmlName);
                        wu.save(fileNameOfWxml, "<!--" + wxmlName + "--><text>" + wxmlName + "</text>");
                        let cssName = wu.changeExt(a, ".wxss");
                        let fileNameOfWxss = path.resolve(dir, cssName);
                        wu.save(fileNameOfWxss, "/* " + cssName + " */");
                    }
                }
            }
        }


        if (app.tabBar && app.tabBar.list) wu.scanDirByExt(dir, "", li => {//search all files
            let digests = [], digestsEvent = new wu.CntEvent, rdir = path.resolve(dir);

            function fixDir(dir) {
                return dir.startsWith(rdir) ? dir.slice(rdir.length + 1) : dir;
            }

            digestsEvent.add(() => {
                for (let e of app.tabBar.list) {
                    e.pagePath = wu.changeExt(e.pagePath);
                    if (e.iconData) {
                        let hash = crypto.createHash("MD5").update(e.iconData, 'base64').digest();
                        for (let [buf, name] of digests) if (hash.equals(buf)) {
                            delete e.iconData;
                            e.iconPath = fixDir(name).replace(/\\/g, '/');
                            break;
                        }
                    }
                    if (e.selectedIconData) {
                        let hash = crypto.createHash("MD5").update(e.selectedIconData, 'base64').digest();
                        for (let [buf, name] of digests) if (hash.equals(buf)) {
                            delete e.selectedIconData;
                            e.selectedIconPath = fixDir(name).replace(/\\/g, '/');
                            break;
                        }
                    }
                }
                wu.save(path.resolve(dir, 'app.json'), JSON.stringify(app, null, 4));
                cb({[configFile]: delWeight});
            });
            for (let name of li) {
                digestsEvent.encount();
                wu.get(name, data => {
                    digests.push([crypto.createHash("MD5").update(data).digest(), name]);
                    digestsEvent.decount();
                }, {});
            }
        }); else {
            wu.save(path.resolve(dir, 'app.json'), JSON.stringify(app, null, 4));
            cb({[configFile]: delWeight});
        }
    });
}

/**
 * 解析插件配置并生成 plugin.json 与页面/组件 json 配置。
 * @param {string} configFile 插件配置文件路径。
 * @param {(deletable:Object<string,number>)=>void} cb 完成回调。
 * @returns {void}
 */
function doPluginConfig(configFile, cb) {
    let dir = path.dirname(configFile);
    wu.get(configFile, content => {
        let e = JSON.parse(content);
        let plugin = {};
        if (e.publicComponents) plugin.publicComponents = e.publicComponents;
        if (e.pages) plugin.pages = e.pages;
        if (e.main) plugin.main = e.main;

        // Normalize pages paths
        if (plugin.pages) {
            for (let key in plugin.pages) {
                plugin.pages[key] = plugin.pages[key].replace(/^__plugin__\/wx\w+\//, "");
            }
        }

        // Save plugin.json
        wu.save(path.resolve(dir, 'plugin.json'), JSON.stringify(plugin, null, 4));

        // Process individual page configs from plugin.json
        if (e.page) {
            for (let pagePath in e.page) {
                let windowConfig = e.page[pagePath].window || {};
                let cleanPath = pagePath.replace(/^__plugin__\/wx\w+\//, "");
                let fileName = path.resolve(dir, wu.changeExt(cleanPath, ".json"));
                wu.save(fileName, JSON.stringify(windowConfig, null, 4));
            }
        }

        // Extract component configs from appservice.js
        let appServicePath = path.resolve(dir, "app-service.js");
        if (!fs.existsSync(appServicePath)) {
            appServicePath = path.resolve(dir, "appservice.js");
        }
        if (fs.existsSync(appServicePath)) {
            let content = fs.readFileSync(appServicePath, {encoding: 'utf8'});
            let matches = content.match(/\_\_wxAppCode\_\_\['[^\.]+\.json[^;]+\;/g);
            if (matches) {
                let attachInfo = {};
                (new VM({
                    sandbox: {
                        __wxAppCode__: attachInfo
                    }
                })).run(matches.join(""));

                for (let name in attachInfo) {
                    let cleanPath = name;
                    if (cleanPath.startsWith("__plugin__/")) {
                        cleanPath = cleanPath.replace(/^__plugin__\/wx\w+\//, "");
                    } else if (cleanPath.startsWith("plugin-private://")) {
                        cleanPath = cleanPath.replace(/^plugin-private:\/\/[^\/]+\//, "");
                    }
                    let fileName = path.resolve(dir, cleanPath);
                    if (attachInfo[name] && attachInfo[name].__warning__) {
                        delete attachInfo[name].__warning__;
                    }
                    wu.save(fileName, JSON.stringify(attachInfo[name], null, 4));
                }
            }
        }

        typeof cb === 'function' && cb({[configFile]: 8});
    });
}

module.exports = {doConfig: doConfig, doPluginConfig: doPluginConfig};
if (require.main === module) {
    wu.commandExecute(doConfig, "Split and make up weapp app-config.json file.\n\n<files...>\n\n<files...> app-config.json files to split and make up.");
}
