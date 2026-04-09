# 将日志重构方案扩展到 reverse_future 的实施计划

## Summary
- 目标：将 `wxappUnpacker` 已落地的日志重构策略（分级过滤、单行进度、文件滚动日志、`-v/--trace` 开关）同步应用到 `reverse_future`，并保持两仓库日志体验一致。
- 范围（按你确认）：仅覆盖 `reverse_future` 的 `npm run unpack` 主链路，不做全项目一刀切改造。
- 技术决策（按你确认）：`reverse_future` 独立实现自己的 `utils/logger.js` / `utils/logStore.js`，不直接依赖 `wxappUnpacker` 的实现文件。

## Current State Analysis
- `wxappUnpacker` 当前状态：
  - 已具备统一日志层与滚动日志文件（`utils/logger.js`、`utils/logStore.js`）。
  - 主要模块（`wuWxapkg/wuWxml/wuWxss/wuJs/wuRestoreZ`）已完成日志分级与降噪接入。
- `reverse_future` 当前状态：
  - `commander/index.js` 中 `console.log/info/warn/error` 分布密集（初始化、解密、反编译、子包循环、unknown_callee 提示、uniapp/mpx 转换阶段）。
  - `scripts/utils.js` 中 `execCmdSync()` 已增强了子进程 `stdout/stderr` 透传，但仍直接打印大量明文内容，缺少统一级别控制与文件下沉。
  - `reverse_future/.gitignore` 当前未忽略 `logs/`，且仓库已有 `logs/unpack-20260409.log`，说明日志目录现实存在但缺少统一约束。
- 关键问题：
  - 控制台噪音仍高，尤其在失败重试/子包循环时会多行堆叠；
  - 用户难以快速区分“致命错误”与“中间步骤信息”；
  - 与 `wxappUnpacker` 的新日志体验存在断层。

## Proposed Changes

### 1) 在 reverse_future 新增独立日志基础设施
- 新增文件：
  - `/Users/guifengxiao/gitstore/unpacker_workspace/reverse_future/utils/logStore.js`
  - `/Users/guifengxiao/gitstore/unpacker_workspace/reverse_future/utils/logger.js`
- 设计要点：
  - 级别：`TRACE/DEBUG/INFO/WARN/ERROR/FATAL`；
  - 控制台阈值默认 `WARN`，文件阈值默认 `DEBUG`；
  - `progress(id, step, status, message)` 单行进度；
  - `result(success|warning|failed, summary)` 仅用于最终摘要（可选颜色）；
  - `-v/--verbose` 展开控制台日志，`--trace` 提升文件日志粒度。

### 2) 在 reverse_future 主入口接入 logger 初始化
- 改造文件：
  - `/Users/guifengxiao/gitstore/unpacker_workspace/reverse_future/commander/index.js`
- 改造点：
  - 启动早期统一初始化 logger（读取 `process.argv` 中 `-v/--verbose/--trace`）；
  - 将“欢迎语、配置打印、交互过程细节”下沉为 `DEBUG/TRACE`；
  - 保留控制台 `WARN+` 的用户可感知信息（失败、回退、子包错误汇总、关键提示）。

### 3) 重构 unpack 主链路日志（仅主链路）
- 改造文件：
  - `/Users/guifengxiao/gitstore/unpacker_workspace/reverse_future/commander/index.js`
  - `/Users/guifengxiao/gitstore/unpacker_workspace/reverse_future/scripts/utils.js`
- 具体策略：
  - `decryptUnpackWxapkg()`：
    - “正在解密/解密失败回退/已复制原包/执行命令”改成单行进度；
    - 非致命过程写文件日志，控制台仅 `WARN/ERROR` 摘要；
    - 子进程大块 `stdout` 默认写文件，控制台显示“摘要 + log id + 文件路径”。
  - 子包循环（`subPackage`）：
    - 每个子包用单行进度（`i/n`）；
    - 失败列表最终汇总保留在控制台（`ERROR`），每条详细堆栈下沉文件。
  - `checkUnknownCalleeLog()`：
    - 控制台保留“发现/未发现”摘要；
    - 详细路径和上下文写入 `DEBUG` 文件日志。

### 4) 统一 `execCmdSync` 日志通道并避免重复刷屏
- 改造文件：
  - `/Users/guifengxiao/gitstore/unpacker_workspace/reverse_future/scripts/utils.js`
- 改造点：
  - 保持当前失败透传能力（已有价值），但将大段 `stdout/stderr` 切换到 logger 文件输出；
  - 控制台默认仅输出：
    - 命令执行摘要；
    - 失败摘要（错误码、关键信息）；
    - 如何展开完整日志（`-v`）提示；
  - `-v` 下允许控制台打印完整子进程输出。

### 5) 日志文件策略与仓库约束
- 改造文件：
  - `/Users/guifengxiao/gitstore/unpacker_workspace/reverse_future/.gitignore`
- 改造点：
  - 增加 `logs/` 忽略规则，避免运行日志污染提交；
  - 日志目录保留但不入库，满足“自动保留文件”与“源码区洁净”平衡。

### 6) 与 wxappUnpacker 的协同输出规范
- 协同文件：
  - `/Users/guifengxiao/gitstore/unpacker_workspace/reverse_future/commander/index.js`
  - `/Users/guifengxiao/gitstore/unpacker_workspace/reverse_future/scripts/utils.js`
- 规范目标：
  - 子进程（`wxappUnpacker`）输出已分级后，`reverse_future` 不二次放大噪音；
  - 最终由 `reverse_future` 输出一次用户向摘要（成功/告警/失败、路径、下一步建议）。

## Assumptions & Decisions
- 决策：本次只覆盖 `reverse_future` unpack 主链路，不扩展到 `vue2.js` / `vue3.js` 非主路径。
- 决策：`reverse_future` 独立 logger，不创建跨仓库运行时依赖。
- 决策：默认控制台 `WARN+`，仅最终摘要可颜色高亮；中间步骤尽量单行并控制长度。
- 假设：你主要从 `reverse_future` 执行 `npm run unpack`，因此验收以该命令输出体验为准。

## Verification Steps
- 验证命令（reverse_future）：
  - `npm run unpack`
  - `npm run unpack -- --verbose` 或 `node commander/index.js --verbose`
  - `npm run unpack -- --trace`（文件追踪）
- 验收标准：
  - 常规模式控制台不再多屏堆栈刷屏，默认仅显示 `WARN+` 与最终摘要；
  - 非致命重试/回退步骤为单行进度或紧凑摘要；
  - 详细诊断可在 `logs/unpack-YYYYMMDD.log` 追溯；
  - `--verbose` 可一键展开完整日志；
  - 终端宽度接近 Terminal#804-929 时，关键输出显著减少折行与误判。

## 风险与回退
- 风险：`reverse_future` 入口日志点多，首轮可能存在漏改。
  - 控制：实施前后对 `commander/index.js` 与 `scripts/utils.js` 执行 `console.*` 扫描。
- 风险：子进程日志双写导致重复摘要。
  - 控制：`execCmdSync` 设定“默认摘要 + verbose 透传”互斥策略。
- 风险：改造后用户短期不适应默认静默。
  - 控制：在最终摘要固定显示 `--verbose/--trace` 指引。
