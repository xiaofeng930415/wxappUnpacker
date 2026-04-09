# 扩展 wuRestoreZ.js 兼容性实现计划

## Summary
目标是在不改变现有解包主流程的前提下，扩展 `wuRestoreZ.js` 对新版 `gz$gwx...` 编译函数组的兼容能力，并减少当前四套 `catchZGroup*` 分支实现的重复与脆弱性。本次实现以 [wuRestoreZ.js](file:///Users/guifengxiao/gitstore/unpacker_workspace/wxappUnpacker/wuRestoreZ.js) 为主修改点，同时校准 [wuWxml.js](file:///Users/guifengxiao/gitstore/unpacker_workspace/wxappUnpacker/wuWxml.js) 对 `zMulName` 的解析规则，避免“前面提取得到，后面无法消费”的断裂。

## Current State Analysis
- [catchZGroup](file:///Users/guifengxiao/gitstore/unpacker_workspace/wxappUnpacker/wuRestoreZ.js#L10-L27) 已具备两项更稳的兼容能力：
  - 同时支持 `function Z(ops,debugLine){` 与 `function Z(ops){` 两种 debug 头。
  - 对 `gz$gwx_1` / `gz$gwx1_2` 这类旧式函数名做了较宽松的 key 提取。
- [catchZGroupWithXC](file:///Users/guifengxiao/gitstore/unpacker_workspace/wxappUnpacker/wuRestoreZ.js#L37-L54)、[catchZGroupWithAppIdXC](file:///Users/guifengxiao/gitstore/unpacker_workspace/wxappUnpacker/wuRestoreZ.js#L64-L85)、[catchZGroupWxPlugin](file:///Users/guifengxiao/gitstore/unpacker_workspace/wxappUnpacker/wuRestoreZ.js#L95-L109) 与 `catchZGroup` 的主体逻辑高度重复，但没有继承 `debugPre2` 兼容能力。
- 四个分支函数的差异主要只有三类：
  - `groupMatch` 正则不同。
  - `preStr.match(...)` 的 key 提取规则不同。
  - 是否保留中间分段编号不同。
- 当前 `catchZ()` 在 [wuRestoreZ.js:L133-L179](file:///Users/guifengxiao/gitstore/unpacker_workspace/wxappUnpacker/wuRestoreZ.js#L133-L179) 内顺序执行多套模式并使用 `Object.assign` 合并结果；若不同模式产出相同 key，存在静默覆盖风险。
- 当前所有分支都依赖固定字符串 `"})(__WXML_GLOBAL__.ops_cached.$gwx"` 截断 IIFE 内容。此实现简单，但对新版本产物的尾部格式变化较敏感。
- [wuWxml.js:L240-L263](file:///Users/guifengxiao/gitstore/unpacker_workspace/wxappUnpacker/wuWxml.js#L240-L263) 也维护了一套独立的 `gz$gwx...` 命名解析规则；若 `wuRestoreZ.js` 扩展了命名模式而 `wuWxml.js` 未同步，后续仍会触发 `Unknown init callee`。

## Proposed Changes

### 1. 收敛四套提取函数的公共流程
- 文件：`/Users/guifengxiao/gitstore/unpacker_workspace/wxappUnpacker/wuRestoreZ.js`
- 修改目标：
  - 提取一个内部通用函数，例如“按 `preStr` 批量执行 VM 提取并回填 `zArr`”。
  - 将以下重复逻辑统一收口：
    - `code.slice(code.indexOf(preStr))`
    - `content.indexOf("(function(z){var a=11;")`
    - `content.indexOf("})(__WXML_GLOBAL__.ops_cached.$gwx")`
    - `new VM({ sandbox: { z, debugInfo: [] } })`
    - `vm.run(content)`
    - `cb({ mul: zArr })`
- 预期收益：
  - 新增兼容模式时只补“正则 + key 解析”即可。
  - 后续修复 `debugPre` 或截断策略时只需改一处。

### 2. 将 `catchZGroup` 的兼容能力下沉为所有模式共享
- 文件：`/Users/guifengxiao/gitstore/unpacker_workspace/wxappUnpacker/wuRestoreZ.js`
- 修改目标：
  - 所有分支统一兼容两种头部：
    - `"(function(z){var a=11;function Z(ops,debugLine){"`
    - `"(function(z){var a=11;function Z(ops){"`
  - 统一使用共享的 “debug 结果降层” 逻辑处理 `z[i] = z[i][1]`。
- 原因：
  - 用户明确希望“扩展兼容性”，而 [catchZGroup](file:///Users/guifengxiao/gitstore/unpacker_workspace/wxappUnpacker/wuRestoreZ.js#L10-L27) 已经体现出更宽的兼容写法，应成为 XC、AppIdXC、Plugin 分支的参考基线。
  - 如果新版产物切换到 `Z(ops)` 形式，当前三支扩展函数会错误保留外层结构，造成还原异常。

### 3. 统一 key 提取与命名归一化策略
- 文件：
  - `/Users/guifengxiao/gitstore/unpacker_workspace/wxappUnpacker/wuRestoreZ.js`
  - `/Users/guifengxiao/gitstore/unpacker_workspace/wxappUnpacker/wuWxml.js`
- 修改目标：
  - 在 `wuRestoreZ.js` 中明确每类模式产出的 key 规则。
  - 在 `wuWxml.js` 中同步同一套规则，确保 `funName -> zMulName` 解析结果与 `zGroupMap` 的 key 完全一致。
- 建议采用的归一化矩阵：
  - `gz$gwx_1` / `gz$gwx1_2` -> 取末尾数字 key。
  - `gz$gwx_XC_1_1` / `gz$gwx1_XC_1_1` -> 保留 `1_1`。
  - `gz$gwx_wx<AppId>_12` -> 取 `12`。
  - `gz$gwx_wx<AppId>_XC_12_1` -> 取 `12`。
- 额外要求：
  - 若同一 key 被不同模式命中，记录一次告警日志，避免静默覆盖。

### 4. 保持正则扩展为“小步增量”，避免一次性重构过度
- 文件：`/Users/guifengxiao/gitstore/unpacker_workspace/wxappUnpacker/wuRestoreZ.js`
- 修改目标：
  - 第一阶段不改 `catchZ()` 的整体调度顺序，仅对现有四类模式做共享逻辑抽取与兼容增强。
  - 保留当前 `groupMatch` 检测顺序：
    - 普通分组
    - XC 分组
    - AppIdXC 分组
    - Plugin 分组
  - 在现有结构内补充更稳的错误信息：
    - 哪一类模式命中
    - 提取到的 key 列表
    - 哪个 `preStr` 解析失败
- 原因：
  - 用户当前诉求是“扩展兼容性”，不是全面重写提取器。
  - 先做结构收敛与规则统一，风险最小。

### 5. 清理低价值调试输出，补充高价值失败日志
- 文件：`/Users/guifengxiao/gitstore/unpacker_workspace/wxappUnpacker/wuRestoreZ.js`
- 修改目标：
  - 删除或收敛当前仅输出 `======================` 的无语义日志。
  - 改为输出具备诊断价值的单行日志，例如：
    - `patternType`
    - `matchedCount`
    - `keys`
    - `failedPreStr`
- 原因：
  - 现有分支函数中的分隔线日志无法说明是哪一类模式命中，也无法帮助定位失败点。

### 6. 验证新兼容路径不会破坏旧回退逻辑
- 文件：`/Users/guifengxiao/gitstore/unpacker_workspace/wxappUnpacker/wuRestoreZ.js`
- 修改目标：
  - 保持 `catchZ()` 在无任何分组命中时仍可进入旧的 `ops_set.$gwx` 回退路径。
  - 不修改 [wuRestoreZ.js:L191-L224](file:///Users/guifengxiao/gitstore/unpacker_workspace/wxappUnpacker/wuRestoreZ.js#L191-L224) 的基本意图，只在必要时补充更明确的失败信息。
- 原因：
  - 旧包与边缘包仍依赖回退逻辑，不应因扩展新版兼容性而被意外破坏。

## Assumptions & Decisions
- 决策：本次实现以“共享通用提取流程 + 保留现有模式分发入口”为主，不进行大范围架构重写。
- 决策：`catchZGroup` 现有的 `debugPre2` 兼容能力应视为基线能力，下沉给 XC、AppIdXC、Plugin 三类扩展分支。
- 决策：`wuRestoreZ.js` 与 `wuWxml.js` 必须同步维护同一套命名归一化规则，否则兼容性扩展不完整。
- 决策：新增日志以“可诊断”为目标，不保留仅有分隔线作用的 `console.log('======================')`。
- 假设：当前项目仍以 CommonJS、回调式结构和最小侵入改动为主，不引入新的模块拆分或测试框架。
- 假设：现有样本至少覆盖普通分组与 XC/AppIdXC/Plugin 中的一类，足以验证兼容扩展是否生效。

## Verification Steps
- 用现有旧格式样本验证普通 `catchZGroup` 路径仍可提取 `z.mul`，且 key 与修改前一致。
- 用带 XC 标识的样本验证 `catchZGroupWithXC` 在 `Z(ops,debugLine)` 与 `Z(ops)` 两种头部下都能正确降层。
- 用 `gz$gwx_wx<AppId>_XC_<n>_1` 样本验证 AppIdXC 路径 key 提取结果与 [wuWxml.js](file:///Users/guifengxiao/gitstore/unpacker_workspace/wxappUnpacker/wuWxml.js) 中 `zMulName` 解析一致。
- 如以插件模式运行，验证 `targetType="plugin"` 时插件分组仍然命中，且不会覆盖普通小程序已有 key 而无日志提示。
- 全量执行一次 `node wuWxapkg.js -t=miniapp <sample.wxapkg>`，确认：
  - `wuRestoreZ.js` 不再因新格式遗漏而退回错误分支。
  - `wuWxml.js` 不再因为已支持的函数名模式触发 `Unknown init callee`。
