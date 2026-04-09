# wuRestoreZ 回退日志未触发与新格式兼容排查计划

## Summary
本次问题表面上出现在 `wuRestoreZ.js` 的 `catchZ()` 回退分支中，用户在 `tailPtr == -1` 判断前新增的 `console.log` 未出现在终端，因此怀疑日志失效。结合当前仓库代码、`Terminal#684-885` 报错链路以及 `reverse_future` 调用方实现，结论是有两个原因叠加：
- 一部分日志位于 `wuRestoreZ.js` 的旧回退分支，该分支在命中新 `gz$gwx...` 分组时不会执行；
- 更关键的是，`reverse_future` 通过 `execSync()` 同步调用 `wuWxapkg.js`，失败时子进程输出被保存在异常对象的 `stdout/stderr` Buffer 中，未被实时透传或解码打印，因此即使子进程里其它位置的 `console.log` 已执行，终端上也可能“完全看不到”。

因此，本计划不再把“console 不生效”理解为 Node/Terminal 层面的输出异常，而是将其拆解为“日志打点位置不可达 + 调用方吞掉失败时的子进程输出”两个独立问题；同时保留对真正业务兼容点 `wuWxml.js` 新 callee 识别不足的后续修复路径。

## Current State Analysis
- `catchZ()` 在命中任意 `gz$gwx...` 分组模式后，会将结果聚合到 `zGroupMap`，并在检测到 `Object.keys(zGroupMap).length > 0` 时立即 `return cb({ mul: zGroupMap })`，不会继续执行旧的 `ops_set.$gwx` 回退逻辑。
- `console.log("code.length...")` 与 `throw new Error("lastPtr == -1")` 位于旧回退逻辑中，仅在“所有新分组匹配都未命中”时才可能执行。
- 当前 `wuRestoreZ.js` 已包含以下新分组提取能力：
  - 普通分组：`gz$gwx_1`、`gz$gwx_12`
  - XC 分组：`gz$gwx_XC_1_1`、`gz$gwx1_XC_1_1`
  - AppId + XC 分组：`gz$gwx_wx<AppId>_XC_12_1`
  - 插件分组：`gz$gwx_wx<AppId>_12`
- 用户提供的 `app-service.js` 在 [app-service.js](file:///Users/guifengxiao/gitstore/unpacker_workspace/wx14210fe3a319f5df/__APP__/app-service.js) 中确实包含 `function gz$gwx_1(){...}` 等标准分组定义，且函数体尾部含有 `})(__WXML_GLOBAL__.ops_cached.$gwx_1)` 结构，说明应优先走分组提取路径，而不是旧回退路径。
- `reverse_future` 的 [utils.js](file:///Users/guifengxiao/gitstore/unpacker_workspace/reverse_future/scripts/utils.js) 中，`execCmdSync()` 直接调用 `execSync(cmd, ...rest)`，默认 `stdio` 为 `pipe`。这意味着子进程输出不会实时显示在父进程终端，而是被缓冲。
- 同一个 `execCmdSync()` 在 `execSync` 成功返回后才会继续执行 `console.info("[执行命令]", cmd)` 与 `buffer.toString(...)`；一旦子进程非零退出，函数会在 `execSync` 处直接抛异常，后续解码与输出逻辑完全不会执行。
- `reverse_future` 的 [index.js](file:///Users/guifengxiao/gitstore/unpacker_workspace/reverse_future/commander/index.js) 调用 `execCmdSync(cmdStr)` 时没有为失败场景补充 `stdout/stderr` 解码打印，因此终端里最终看到的是 Node 打印出的 `Error: Command failed ...` 以及原始 `Buffer(...)` 摘要，而不是子进程中各处 `console.log` 的正常文本。
- `Terminal#684-885` 中出现的后续报错链路最终落到 `wuWxml.js` 的 `Unknown init callee ...` 分支，而非 `wuRestoreZ.js` 的旧回退路径。这说明 `getZ()` 已经完成了 `z` / `z.mul` 构建，问题出现在后续 WXML AST 还原阶段。
- `wuWxml.js` 当前仅兼容有限几类 `dec.init.callee.name` 正则，若新格式函数名不落入这些模式，会直接抛出 `Unknown init callee`，导致还原中断。

## Proposed Changes

### 1. 先修复调用方输出策略，保证失败时能看到子进程真实日志
- 文件：
  - `/Users/guifengxiao/gitstore/unpacker_workspace/reverse_future/scripts/utils.js`
  - `/Users/guifengxiao/gitstore/unpacker_workspace/reverse_future/commander/index.js`
- 原因：在 `execSync()` 默认 `pipe` 模式下，子进程输出被缓冲；失败时父进程不做解码打印，会让“所有 console 都没生效”的现象持续存在，影响后续任何调试。
- 做法：
  - 方案优先级一：将 `execSync(cmd, ...rest)` 改为显式 `stdio: "inherit"` 或等价配置，使 `wuWxapkg.js` 的 `console.log/console.error` 直接透传到当前终端。
  - 方案优先级二：若必须保留缓冲模式，则用 `try/catch` 包住 `execSync`，在 `catch` 中对 `error.stdout` 与 `error.stderr` 做 `toString("utf8")` 解码并打印，再重新抛出异常。
  - 保证失败时也能看到 `wuRestoreZ.js` / `wuWxml.js` 中的调试日志，而不是只看到 `Buffer(...)` 摘要。

### 2. 调整 `wuRestoreZ.js` 排查重点，停止在旧回退分支继续加日志
- 文件：`/Users/guifengxiao/gitstore/unpacker_workspace/wxappUnpacker/wuRestoreZ.js`
- 原因：当前日志位置位于不可达或低概率到达的分支，继续在这里补 `console.log` 无法解释新格式兼容问题。
- 做法：
  - 保留 `catchZ()` 现有“分组命中即提前返回”的主路径判断。
  - 若仍需观察 `wuRestoreZ.js` 是否命中新分组，应将日志放在每类 `groupMatch` 命中后、`mergeZGroups()` 前后，或放在 `if (Object.keys(zGroupMap).length)` 返回前，记录命中的模式类型与 key 列表。
  - 避免继续把调试信息放在旧回退分支，以免形成“日志未打印 = console 失效”的误判。

### 3. 以 `wuWxml.js` 为主修复新格式兼容
- 文件：`/Users/guifengxiao/gitstore/unpacker_workspace/wxappUnpacker/wuWxml.js`
- 原因：终端报错链路说明当前主失败点在 `Unknown init callee`，不是 `tailPtr == -1`。
- 做法：
  - 梳理 `analyze()` 中 `VariableDeclaration` -> `CallExpression` -> `default` 分支对 `dec.init.callee.name` 的解析逻辑。
  - 收集用户样本 `app-service.js` 中所有 `gz$gwx...` 函数调用形式，形成“函数声明模式”和“调用模式”两个集合。
  - 将 `wuWxml.js` 中 `zMulName` 提取正则与 `wuRestoreZ.js` 中已支持的分组命名规则保持一致，必要时抽出同一套命名解析逻辑，避免两处正则长期漂移。
  - 若存在无法映射到具体 `z.mul` key 的特殊函数名，增加明确的诊断日志，打印原始 `funName`、调用上下文及已存在的 `z.mul` keys，用于补齐规则。

### 4. 对 `wuRestoreZ.js` 与 `wuWxml.js` 的命名规则做“一致性治理”
- 文件：
  - `wuRestoreZ.js`
  - `wuWxml.js`
- 原因：当前一个文件负责“提取 z 分组”，另一个文件负责“根据 callee 名找到 zMulName”；若两边支持矩阵不一致，就会出现“前面提出来了，后面却不会用”的断裂。
- 做法：
  - 明确支持矩阵，至少覆盖以下类别：
    - `gz$gwx_<n>`
    - `gz$gwx<d>_<n>`
    - `gz$gwx_XC_<a_b>` / `gz$gwx<d>_XC_<a_b>`
    - `gz$gwx_wx<AppId>_<n>`
    - `gz$gwx_wx<AppId>_XC_<n>_1`
  - 对每类规则统一“提取 key 的目标值”，确保 `wuRestoreZ.js` 产出的 `zGroupMap` key 与 `wuWxml.js` 查找时使用的 key 完全一致。

### 5. 为后续调试补充最小可验证观测点
- 文件：
  - `reverse_future/scripts/utils.js`
  - `wuRestoreZ.js`
  - `wuWxml.js`
- 原因：当前通过“是否打印某一行 console”判断执行流，粒度过粗，且容易因提前返回被误导。
- 做法：
  - 在 `reverse_future/scripts/utils.js` 中保证失败时完整输出子进程 stdout/stderr 文本，作为最外层观测面。
  - 在 `wuRestoreZ.js` 中增加一次性摘要日志：
    - 命中的分组模式类型
    - `zGroupMap` key 数量与前几个 key
    - 是否走了旧回退路径
  - 在 `wuWxml.js` 中增加精确失败日志：
    - `funName`
    - 解析出的 `zMulName`
    - `Object.keys(z.mul || {})`
    - 当前模板/页面上下文
  - 日志应指向“哪一步失败”，而不是仅证明“某段代码没执行”。

## Assumptions & Decisions
- 决策：将“`console` 不生效”拆分为两个问题：
  - 子进程内某些日志位于未执行分支；
  - 父进程 `execSync()` 失败时未透传/解码子进程输出。
- 决策：优先修改 `reverse_future/scripts/utils.js` 的命令执行输出策略，而不是继续在 `wuRestoreZ.js` 内部盲目补日志。
- 决策：不优先修改 `wuLib.js`、`wuWxapkg.js`，因为当前证据不足以表明它们吞掉了标准输出。
- 决策：兼容新格式时，优先保证 `wuRestoreZ.js` 与 `wuWxml.js` 的命名解析规则一致，而不是继续为单一报错点打补丁。
- 假设：用户当前样本包中的 `gz$gwx_1` 等函数属于已可被 `wuRestoreZ.js` 识别的分组形式，因此旧回退路径本应不再是主路径。
- 假设：当前看到的 `tailPtr == -1` 与 `Unknown init callee` 报错可能来自不同轮次代码状态；正式实施时需先以当前工作区代码重新跑一次样本，确认最新失败点。

## Verification Steps
- 重新执行相同样本包，确认父进程终端能够直接看到 `wuWxapkg.js` 子进程输出，不再只显示 `Buffer(...)`。
- 确认 `wuRestoreZ.js` 输出“命中分组并提前返回”的摘要日志，而不是依赖旧回退分支日志。
- 检查 `wuWxml.js` 是否仍报 `Unknown init callee`；若报错，记录原始 `funName` 并与 `z.mul` keys 比对。
- 对用户提供的 [app-service.js](file:///Users/guifengxiao/gitstore/unpacker_workspace/wx14210fe3a319f5df/__APP__/app-service.js) 样本，验证至少一条新格式 callee 可以被成功映射到对应 `zMulName`。
- 完整跑通一次 `node wuWxapkg.js -t=miniapp <sample.wxapkg>`，确认 WXML 还原阶段不再因新 callee 命名而中断。
