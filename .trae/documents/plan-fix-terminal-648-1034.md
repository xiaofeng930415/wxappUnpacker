# Terminal#648-1034 报错诊断与修复计划

## Summary
- 目标：修复 `npm run unpack` 过程中出现的 `_oz content undefined`、`ReferenceError: __wxConfig is not defined` 以及后续解包链路中断问题，确保主流程可继续执行并可观测。
- 范围：按你确认的“双仓库联修”，同时修改 `wxappUnpacker` 与 `reverse_future`。
- 验收入口：按你确认仅使用 `reverse_future` 的 `npm run unpack` 进行端到端验证。

## Current State Analysis
- `reverse_future/commander/index.js` 在 `decryptUnpackWxapkg()` 中通过 `execCmdSync(cmdStr)` 同步调用 `wxappUnpacker/wuWxapkg.js`，命令失败会直接抛异常中断当前包处理。
- `reverse_future/scripts/utils.js` 的 `execCmdSync()` 直接 `execSync(cmd, ...rest)`；当子进程失败时，函数不打印已缓冲的 `stdout/stderr` 明文，仅由上层异常对象展示 `Buffer(...)` 摘要，导致排障可观测性差。
- `wxappUnpacker/wuJs.js` 的 `splitJs()` 在 `vm.run(code)` 阶段只注入了 `__wxAppCode__` 等最小沙箱对象，未显式提供 `__wxConfig`，与当前样本 `app-service.js` 中 `Object.assign(__wxConfig, ...)` 用法不兼容，触发 `ReferenceError: __wxConfig is not defined`。
- `wxappUnpacker/wuWxml.js` 中 `_oz` 分支已有“content undefined”日志，且日志中 `zMulName` 与 `Object.keys(z.mul)` 都能输出，说明 `getZ()` 主路径多数情况下已执行；该日志当前更偏向数据缺失告警而非首个致命异常。
- 终端主失败点由 `wuJs.js` 抛错向上传播至 `reverse_future`，当前优先级应先保证 JS 拆分阶段不被 `__wxConfig` 缺失阻断，再评估是否需要收敛 `_oz` 告警策略。

## Proposed Changes

### 1. 调整调用层命令执行可观测性（reverse_future）
- 文件：
  - `/Users/guifengxiao/gitstore/unpacker_workspace/reverse_future/scripts/utils.js`
  - `/Users/guifengxiao/gitstore/unpacker_workspace/reverse_future/commander/index.js`（仅在必要时做最小接入调整）
- 变更内容：
  - 在 `execCmdSync()` 增加失败分支 `try/catch`：
    - 捕获 `execSync` 抛错对象中的 `stdout/stderr`。
    - 按 `utf8`（或传入编码）解码并打印，避免仅看到 `Buffer(...)`。
    - 保持原有抛错语义，确保上层流程控制不被破坏。
  - 保持默认 `pipe` 模式，以兼容当前函数在其他调用处依赖返回字符串的行为；不直接全局切到 `stdio: inherit`，避免破坏既有返回值契约。
- 目的：
  - 让 `npm run unpack` 失败时直接看到 `wuWxapkg.js` 子进程真实日志，提升定位效率。

### 2. 修复 `__wxConfig` 缺失导致的 VM 执行中断（wxappUnpacker）
- 文件：
  - `/Users/guifengxiao/gitstore/unpacker_workspace/wxappUnpacker/wuJs.js`
- 变更内容：
  - 在 `splitJs()` 的 VM `sandbox` 中补充兼容性全局桩：
    - `__wxConfig`（最小对象结构，包含可安全访问字段）
    - `global/globalThis/window/self` 的一致引用（指向同一沙箱对象）
    - 必要时补充常见空实现（如 `Reporter`）以防新样本触发次级引用错误
  - 保持 `define/require/definePlugin` 现有行为不变，避免影响已支持包型。
  - 对兼容桩加简短注释，说明其用途是“解包时静态执行容错，不代表真实运行时”。
- 目的：
  - 避免 `vm.run(code)` 因缺失全局变量直接抛错，使 JS 拆分流程可继续。

### 3. 收敛 `_oz` 诊断日志策略，避免误判为主故障（wxappUnpacker）
- 文件：
  - `/Users/guifengxiao/gitstore/unpacker_workspace/wxappUnpacker/wuWxml.js`
- 变更内容：
  - 保留 `_oz` 数据缺失日志，但增加“限次/汇总”策略（单文件只打印前 N 条，或在结束时输出计数摘要），避免刷屏掩盖真正致命堆栈。
  - 当 `content` 为 `undefined` 时，将上下文信息统一格式化（`funName/zMulName/key`）便于比对，不在每次都打印完整 `Object.keys(z.mul)`。
- 目的：
  - 降低日志噪声，让终端聚焦真正阻断流程的错误。

### 4. 依赖与配置检查（按需）
- 文件：
  - `/Users/guifengxiao/gitstore/unpacker_workspace/wxappUnpacker/package.json`
  - `/Users/guifengxiao/gitstore/unpacker_workspace/reverse_future/package.json`
- 变更内容：
  - 仅在实施中发现明确依赖不兼容证据时再调整（例如 `vm2` 或编码库行为差异）；否则不做无证据升级，控制变更面。
  - 若无需升级，计划中记录“已检查，不变更”。
- 目的：
  - 满足“依赖更新或配置调整”要求，同时避免引入与当前问题无关的回归。

## 实施步骤（执行顺序）
1. 只读复现一次当前错误链路（保留原始日志）：
   - 在 `reverse_future` 执行 `npm run unpack`，确认现状与 Terminal#648-1034 一致。
2. 修改 `reverse_future/scripts/utils.js` 的 `execCmdSync()` 失败打印逻辑。
3. 修改 `wxappUnpacker/wuJs.js` 的 VM 沙箱注入，补齐 `__wxConfig` 及相关全局别名。
4. 运行一次 `npm run unpack`，确认 `ReferenceError: __wxConfig is not defined` 不再出现。
5. 若仍有 `_oz` 高频噪声，修改 `wuWxml.js` 日志策略并再次验证。
6. 做最小回归检查，确认未引入新的致命异常（尤其是 `splitJs` 与后续 `doFrame` 链路）。

## Assumptions & Decisions
- 决策：优先修复“阻断执行”的 `__wxConfig` 缺失，再优化 `_oz` 诊断噪声。
- 决策：`execCmdSync()` 保持返回字符串契约，不采用全局 `stdio: inherit` 以降低对其他调用点的影响。
- 假设：当前样本包中的 `_oz content undefined` 多为数据不完整场景，不是首个致命异常来源。
- 假设：双仓库联修可直接在当前工作区进行，且你后续将继续以 `npm run unpack` 作为主入口验证。

## Verification Steps
- 主验收命令（在 `reverse_future` 目录）：
  - `npm run unpack`
- 验收标准：
  - 不再出现 `ReferenceError: __wxConfig is not defined`。
  - 命令失败时（若有）终端可直接看到子进程可读日志，不再只有 `Buffer(...)`。
  - 解包流程可继续推进到后续阶段；若存在新错误，日志可明确定位到具体模块与函数，不再“黑盒失败”。
  - 修改后未新增新的致命异常（至少完成一轮完整入口验证）。

## 风险与回退
- 风险：VM 沙箱补桩过多可能掩盖真实语义错误。
  - 控制：仅注入最小必要对象，保持默认空实现，避免模拟复杂业务行为。
- 风险：`execCmdSync()` 错误输出增强可能改变部分日志顺序。
  - 控制：保持返回值与抛错行为不变，仅增强失败可观测性。
- 回退策略：
  - 每个文件独立小步提交；若某步引入回归，按文件粒度回退对应改动。
