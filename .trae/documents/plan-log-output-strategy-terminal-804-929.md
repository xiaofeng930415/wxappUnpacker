# 日志输出策略优化计划（面向 Terminal#804-929）

## Summary
- 目标：将当前“多模块直接 `console.*` 输出”的日志方式，升级为“统一日志层 + 分级过滤 + 控制台摘要 + 文件详单”，满足你提出的 6 条要求。
- 关键结果：
  - 控制台默认仅显示 `WARN` 及以上的“用户可感知”信息；
  - 中间重试/回退步骤改为单行进度输出（不刷多行堆栈）；
  - 调试细节下沉到滚动文件日志，可通过一键开关展开完整日志；
  - 在你给出的宽度场景下尽量避免折行，颜色仅用于最终结果与关键摘要。

## Current State Analysis
- 目前日志分散在多个文件、多个风格，缺少统一级别与通道：
  - `wuWxss.js`：`runVM()` 和两轮转换流程打印大量错误堆栈与中间态（如 `dir, frameFile, mainCode, files`、`【error】`）。
  - `wuWxml.js`：打印完整对象（`rE/rF/x/requireInfo`）和失败 payload，输出量大且易折行。
  - `wuWxapkg.js`：输出候选文件、候选失败 payload、cleanup JSON，存在信息密度不均。
  - `wuJs.js` / `wuRestoreZ.js`：直接 `console.error` 输出堆栈与上下文，未做过滤。
- 当前缺少：
  - 统一日志级别（TRACE/DEBUG/INFO/WARN/ERROR/FATAL）；
  - 控制台与文件双通道策略；
  - 终端宽度友好的单行进度与摘要规则；
  - “一键展开完整日志”开关。
- 结果是你提供的 Terminal#804-929 出现了典型问题：
  - 非致命异常（wxss VM fallback）多次完整堆栈刷屏；
  - 大对象和绝对路径长行导致频繁折行；
  - 用户难以快速判断“最终是否成功”。

## Proposed Changes

### 1) 新增统一日志模块（核心）
- 新增文件：
  - `/Users/guifengxiao/gitstore/unpacker_workspace/wxappUnpacker/utils/logger.js`
- 职责：
  - 提供 `trace/debug/info/warn/error/fatal` API；
  - 提供 `progress(id, step, status, message)` 单行进度输出；
  - 提供 `groupStart/groupEnd`（退化为单行前缀，避免终端不支持折叠）；
  - 提供 `setVerbose(flag)` / 环境变量开关（如 `WXU_VERBOSE=1`）；
  - 提供控制台级别阈值（默认 `WARN`）和文件级别阈值（默认 `DEBUG`）。
- 输出策略：
  - 控制台：默认仅 `WARN+`；`INFO` 仅保留最终成功摘要；
  - 文件：完整记录（含堆栈、payload、重试细节）。

### 2) 新增滚动文件日志与缓存
- 新增文件：
  - `/Users/guifengxiao/gitstore/unpacker_workspace/wxappUnpacker/utils/logStore.js`
- 行为：
  - 日志写入 `./logs/unpack-YYYYMMDD.log`（按天滚动）；
  - 单文件上限（例如 5MB）+ 备份轮转（例如 3 份）；
  - 内存环形缓存（最近 N 条）用于错误时“快速摘要 + 引导查看完整日志路径”。
- 控制台不再直接打印完整异常对象，仅打印：
  - 错误摘要 ID（可追踪）；
  - 关键上下文（模块、阶段、是否触发回退）；
  - 日志文件路径与展开提示。

### 3) 接入 `wuWxapkg.js`（总控层）
- 目标文件：
  - `/Users/guifengxiao/gitstore/unpacker_workspace/wxappUnpacker/wuWxapkg.js`
- 改造点：
  - `createCleanupScheduler()` 的 JSON 原样输出改为简短摘要（成功/失败、数量）；
  - `dealPageFrame()`：
    - 候选列表打印简化为单行（仅数量 + 当前候选 basename）；
    - 候选失败 payload 下沉到 DEBUG 文件日志，控制台只留 WARN 摘要；
    - 重试过程用 `progress` 单行更新。
  - 最终统一输出“完成摘要”：
    - 成功模块数、回退次数、警告数、日志文件路径。

### 4) 接入 `wuWxml.js`（WXML 解析与回退）
- 目标文件：
  - `/Users/guifengxiao/gitstore/unpacker_workspace/wxappUnpacker/wuWxml.js`
- 改造点：
  - `doFrame()` 中 `fail()`：
    - 控制台只打 `WARN` 摘要：`stage + file + reason`；
    - `originalError.stack` 和 `payload` 全量写文件。
  - `rE/rF/x/requireInfo` 的整对象打印默认关闭，仅 `verbose` 开关开启时输出到文件；
  - `_oz/_o` 缺失内容日志继续限次，但控制台只显示计数摘要（例如“missing_content_oz x5”）。

### 5) 接入 `wuWxss.js`（本次刷屏主来源）
- 目标文件：
  - `/Users/guifengxiao/gitstore/unpacker_workspace/wxappUnpacker/wuWxss.js`
- 改造点：
  - `runVM()`：
    - `SyntaxError` 等非致命异常改为 `DEBUG` 文件日志（含堆栈）；
    - 控制台只显示 `WARN` 单行：“一次转换失败，进入新方式回退”；
    - 两轮失败时才升级为 `ERROR`。
  - 去除默认写入调试副产物（`scriptCode*.js`、`g.js`、`pureData.txt`、`mainCode.js`、`frameFile.txt`）的控制台提示；
  - 将 “Guess first turn / second turn / Save wxss” 改为单行进度。

### 6) 接入 `wuJs.js` 与 `wuRestoreZ.js`（补齐边缘模块）
- 目标文件：
  - `/Users/guifengxiao/gitstore/unpacker_workspace/wxappUnpacker/wuJs.js`
  - `/Users/guifengxiao/gitstore/unpacker_workspace/wxappUnpacker/wuRestoreZ.js`
- 改造点：
  - `wuJs` 的 skip split 输出改为 `WARN` 单行（文件 basename + 原因摘要），堆栈写文件；
  - `wuRestoreZ` 的 `lastPtr` 诊断：
    - 控制台仅 `ERROR` 摘要（长度、特征、建议）；
    - `code[0-100]` 等细节转入 DEBUG 文件日志。

### 7) 一键展开完整日志开关与 CLI 约定
- 改造文件：
  - `/Users/guifengxiao/gitstore/unpacker_workspace/wxappUnpacker/wuLib.js`（参数解析入口）
  - `/Users/guifengxiao/gitstore/unpacker_workspace/wxappUnpacker/wuWxapkg.js`（初始化 logger）
- 设计：
  - 新增参数：`-v` / `--verbose`（展开全部控制台日志）；
  - 新增参数：`--trace`（开启 TRACE 到文件）；
  - 默认不传时：控制台 `WARN+`，文件 `DEBUG+`；
  - 最终摘要中固定显示“如何展开完整日志”提示。

### 8) 终端宽度与颜色规范（避免误判）
- 执行规范：
  - 控制台单行长度软限制（建议 100 字符内），路径使用 basename 或中间截断；
  - 仅最终结果与关键摘要使用颜色：
    - 成功：绿色摘要；
    - 有回退但完成：黄色摘要；
    - 终止失败：红色摘要；
  - 中间过程禁止彩色堆栈输出；
  - 不支持颜色时自动降级纯文本。

## Assumptions & Decisions
- 决策：不在本次计划引入第三方日志依赖（如 `winston`），优先用本仓库轻量实现，降低侵入与兼容风险。
- 决策：控制台“用户可感知”阈值默认为 `WARN`，但保留 `-v` 一键展开完整日志能力。
- 决策：当前各模块已有回退逻辑（特别是 `wuWxss`），本次重点是“日志可读性与噪声控制”，不改变核心回退算法。
- 假设：你的主要使用入口仍是 `npm run unpack`（上层 `reverse_future` 调起 `wuWxapkg`），因此摘要日志必须在子进程标准输出中可读。

## Verification Steps
- 核验命令（macOS）：
  - 常规：`node wuWxapkg.js -t=miniapp <sample.wxapkg>`
  - 展开：`node wuWxapkg.js -v -t=miniapp <sample.wxapkg>`
- 验收标准：
  - 常规模式下控制台不再出现多屏堆栈刷屏（特别是 `wuWxss` 两轮 fallback 场景）；
  - 仍保留最终成功状态与关键摘要（含回退次数/告警数）；
  - 非致命错误在控制台降为单行 WARN，在文件日志可追溯完整堆栈；
  - 出现重试/回退时为单行进度或组摘要，不输出大对象多行；
  - 在 Terminal#804-929 同等宽度下，主要控制台行不折行或显著减少折行。

## 风险与回退
- 风险：过滤过度导致排障信息不足。
  - 控制：强制输出错误 ID + 日志文件路径 + `-v` 展开提示。
- 风险：改造范围跨多个模块，易遗漏直写 `console.*`。
  - 控制：实施前后用全仓 `Grep` 扫描未迁移日志点，保留白名单。
- 回退策略：
  - logger 采用“可旁路”设计：若新模块异常，可临时回退到原 `console` 路径并保留文件日志写入。
