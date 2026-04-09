# 让 wuWxapkg 外层可捕获 doFrame 异步错误的修复计划

## Summary
- 目标：修复 `wuWxapkg.js` 在调用 `wuMl.doFrame(...)` 时“外层 `try/catch` 无法捕获异步错误、进程被中断”的问题，覆盖 Terminal#759-1021 中的 `lastPtr == -1` 场景。
- 核心思路：把当前“同步 `try/catch` 捕获异步链路”的伪保护，改为“显式错误回调/错误通道”机制，让 `wuWxml.doFrame` 把错误上报给 `wuWxapkg`，由外层统一决策（降级继续、换候选文件、或最终失败）。
- 变更范围：仅 `wxappUnpacker` 仓库，主要涉及 `wuWxapkg.js` 与 `wuWxml.js` 两个文件。

## Current State Analysis
- 触发点位于 [wuWxapkg.js](file:///Users/guifengxiao/gitstore/unpacker_workspace/wxappUnpacker/wuWxapkg.js#L214-L231) 的 `dealPageFrame()`：
  - 代码对 `wuMl.doFrame(filePath, doBack, order, mainDir)` 使用同步 `try/catch`。
  - 但 `doFrame()` 内部实际是 `wu.get(...callback)` + `getZ(...)` 的异步链路，异常在回调中抛出，外层同步 `try/catch` 无法捕获。
- `lastPtr == -1` 在 [wuRestoreZ.js](file:///Users/guifengxiao/gitstore/unpacker_workspace/wxappUnpacker/wuRestoreZ.js#L247-L251) 抛出，调用栈显示异常发生在 `wuWxml.js` 的异步回调内，最终直接打断子进程。
- `dealPageFrame()` 当前返回值为同步 `boolean`，与异步执行模型不匹配：
  - `return true/false` 只代表“函数调用是否发起”，不代表“异步流程是否成功”。
  - 导致外层“看似捕获，实则漏捕获”的行为。
- 事件计数器 `weappEvent` 依赖每个处理器调用一次 `doBack()` 才能收敛；若 `doFrame` 异步异常后未正确回调，存在流程悬挂或异常退出风险。

## Proposed Changes

### 1) 为 `wuWxml.doFrame` 增加显式错误通道
- 文件：`/Users/guifengxiao/gitstore/unpacker_workspace/wxappUnpacker/wuWxml.js`
- 方案：
  - 扩展签名：`doFrame(name, cb, order, mainDir, onError)`（新增可选错误回调）。
  - 在 `wu.get` 回调入口、`getZ` 调用点、`getZ` 回调主体分别加边界保护（`try/catch`），统一走 `onError(err, context)` 上报，禁止异步链路裸 `throw`。
  - 成功路径仍保持 `cb({[name]:4})`，不改变既有成功语义。
- 目的：
  - 将“不可捕获异步异常”改为“可上报可处理错误事件”。

### 2) 重写 `dealPageFrame` 的控制语义（从同步布尔改为异步结果）
- 文件：`/Users/guifengxiao/gitstore/unpacker_workspace/wxappUnpacker/wuWxapkg.js`
- 方案：
  - 去掉当前无效的同步 `try/catch` 保护。
  - 把 `dealPageFrame(fileList, dir, mainDir)` 改造成“带回调的异步调度函数”，例如：
    - `dealPageFrame(fileList, dir, mainDir, done)`，`done({ok, filePath, err})`。
  - 在调用 `wuMl.doFrame` 时传入 `onError`：
    - 首个候选失败时，尝试下一个候选 `page-frame-like` 文件；
    - 候选全部失败时，向外层返回明确失败对象（而非进程崩溃）。
  - 保证计数器一致性：最终无论成功或失败，都确保 `doBack`/计数收敛策略不丢失，避免事件悬挂。
- 目的：
  - 让“外层能捕获到错误并决策”成为真实行为，而非同步假象。

### 3) 外层失败策略：可控降级而非硬崩溃
- 文件：`/Users/guifengxiao/gitstore/unpacker_workspace/wxappUnpacker/wuWxapkg.js`
- 方案：
  - 当 `dealPageFrame` 返回失败时，输出结构化日志（候选文件、失败原因、建议）。
  - 保留可配置策略：
    - 默认策略：记录失败并继续后续可执行步骤（不中断整个包处理）。
    - 严格策略（可选）：在特定参数下抛出最终错误。
- 目的：
  - 满足“外层可捕获”的同时，避免因单点 WXML 失败导致全流程硬中断。

### 4) 补充上下文日志，便于关联 Terminal 现场
- 文件：
  - `wuWxml.js`
  - `wuWxapkg.js`
- 方案：
  - 统一错误日志字段：`stage`、`filePath`、`candidate`、`targetType`、`originalError`。
  - 发生 `lastPtr == -1` 时，除了保留原异常信息，还要在外层打印“已捕获并降级/已尝试候选切换”的决策日志。
- 目的：
  - 用户在 `npm run unpack` 终端中可以直接看出“错误已被外层接住并进入降级流程”。

## Assumptions & Decisions
- 决策：优先修复错误传播通道（异步可捕获）而不是先扩展 `restoreZ` 解析规则。
- 决策：不再依赖同步 `try/catch` 包裹异步 API；统一采用回调错误通道。
- 决策：保持现有模块风格（CommonJS + callback），不引入 Promise/async-await 大改动。
- 假设：当前故障可通过“捕获并降级/换候选文件”显著降低中断概率，即便 `lastPtr == -1` 仍可能在某些包上出现。

## Verification Steps
- 核验命令（macOS）：
  - `npm run unpack`（走 `reverse_future` 入口）
  - `node wuWxapkg.js -t=miniapp <sample.wxapkg>`（直连 unpacker）
- 重点验收：
  - 出现 `lastPtr == -1` 时，不再直接导致未捕获异常终止；
  - 终端可见“外层已捕获 + 处理策略（切换候选/降级继续）”日志；
  - `weappEvent` 能正常收敛，不出现流程卡住；
  - 非异常包路径行为不回归（仍可成功完成 WXML/WXSS/配置流程）。

## 风险与回退
- 风险：改造 `dealPageFrame` 为异步后，若计数器处理不当可能导致“提前结束”或“永不结束”。
  - 控制：在计划实施时先绘制 `doBack` 调用次数矩阵（成功/失败/全失败）并逐条验证。
- 风险：降级继续可能隐藏真实兼容问题。
  - 控制：错误日志中必须保留原始异常堆栈与文件路径，不做静默吞错。
- 回退：若异步改造导致连锁回归，可先保留错误上报接口，仅在 `doFrame` 内做“捕获+回调+失败终止”，逐步再引入候选切换。
