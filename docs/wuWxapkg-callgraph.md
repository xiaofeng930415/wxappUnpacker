# wuWxapkg.js 递归调用关系文档

## 入口与目标
- 入口文件：`wxappUnpacker/wuWxapkg.js`
- 入口函数：`doFile(name, cb, order)`
- 分析范围：以 `wuWxapkg.js` 为根，递归到其本地依赖模块及关键函数调用链

## 模块清单与调用函数

### 1) wuWxapkg.js
- 导出函数
  - `doFile(name, cb, order)`
- 关键内部函数
  - `header(buf)`
  - `genList(buf)`
  - `saveFile(dir, buf, list)`
  - `createCleanupScheduler(dir, order, doneCb)`
  - `packDone(dir, cb, order)`
  - `packDone/doBack(deletable)`
  - `packDone/dealPageFrame(fileList, dir, mainDir)`
  - `packDone/dealThreeThings(dir, mainDir, nowDir)`
  - `packDone/findDir(dir, oldDir)`（分包场景递归）
- 直接调用的跨模块函数
  - `wu.get` / `wu.save` / `wu.addIO` / `wu.del` / `wu.commandExecute`
  - `wuJs.splitJs`
  - `wuCfg.doConfig` / `wuCfg.doPluginConfig`
  - `wuMl.doFrame`
  - `wuSs.doWxss`
  - `del.doDel`

### 2) wuLib.js
- 导出函数
  - `mkdirs` `get` `save` `toDir` `del` `addIO`
  - `changeExt` `CntEvent` `scanDirByExt` `commonDir` `commandExecute`
- 在主链路中被调用的函数
  - `get`：读取包文件、配置文件与脚本文件
  - `save`：写入解包后文件与恢复结果
  - `addIO`：调度 IO 完成回调
  - `del`：删除中间文件
  - `CntEvent`：聚合并发回调
  - `commandExecute`：CLI 调度入口
  - `toDir` / `changeExt` / `commonDir` / `scanDirByExt`：在下游模块中参与路径与文件扫描处理

### 3) wuJs.js
- 导出函数
  - `jsBeautify`
  - `wxsBeautify`
  - `splitJs`
- 在主链路中被调用的函数
  - `splitJs`：拆分 `app-service.js` / `appservice.js` / `workers.js` 并回写独立 JS 文件

### 4) wuConfig.js
- 导出函数
  - `doConfig`
  - `doPluginConfig`
- 在主链路中被调用的函数
  - `doConfig`：拆分 `app-config.json`，恢复 `app.json` 与页面级 JSON
  - `doPluginConfig`：恢复插件 `plugin.json` 与页面/组件配置

### 5) wuWxml.js
- 导出函数
  - `doFrame`
  - `tryWxml`
- 在主链路中被调用的函数
  - `doFrame`：从 page-frame 类文件恢复 WXML/WXS
  - `tryWxml`：单页反编译并带失败兜底

### 6) wuWxss.js
- 导出函数
  - `doWxss`
- 在主链路中被调用的函数
  - `doWxss`：从 page-frame/app-wxss 运行时脚本恢复 WXSS

### 7) utils/del.js
- 导出函数
  - `doDel`
- 在主链路中被调用的函数
  - `doDel`：执行中间产物清理并返回统计结果

## 递归调用链（函数级）

### A. CLI 入口链
1. `wu.commandExecute(doFile, helpText)`
2. `doFile(name, cb, order)`
3. `wu.get(name, readWxapkgBuffer, { encoding: null })`
4. `header(...)` + `genList(...)` + `saveFile(...)`
5. `wu.addIO(packDone, dir, cleanupTriggerCb, order)`（非 `-o`）

### B. 解包后恢复主链（小程序/插件）
1. `packDone(...)`
2. `dealThreeThings(...)`
3. `wuCfg.doConfig(...)` 或 `wuCfg.doPluginConfig(...)`
4. `wuJs.splitJs(...)`（app-service/appservice/workers）
5. `dealPageFrame(...) -> wuMl.doFrame(...)`
6. `wuSs.doWxss(...)`
7. `doBack(...)` 汇总删除权重 -> `CntEvent` 收敛完成 -> `wu.del(...)`

### C. 清理触发链
1. `createCleanupScheduler(...).trigger("main")`
2. `del.doDel(dir)`
3. 进程兜底：`scheduleFallback() -> beforeExit -> trigger("fallback")`

### D. 分包递归链
1. `packDone` 分包分支命中 `-s=...`
2. `findDir(dir, oldDir)` 深度遍历目录（递归）
3. 找到 `app-service.js` 或 `appservice.js`
4. `dealThreeThings(workDir, mainDir, oldDir)` 进入与主包同构恢复流程

## 调用关系图（文本）
```text
commandExecute
  -> doFile
     -> get(wxapkg)
     -> header
     -> genList
     -> saveFile -> save
     -> packDone
        -> doConfig | doPluginConfig
        -> splitJs
        -> doFrame -> tryWxml
        -> doWxss
        -> del (weighted)
     -> cleanupScheduler.trigger
        -> doDel
```
