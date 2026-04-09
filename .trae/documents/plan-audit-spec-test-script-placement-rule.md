# 计划：排查并修复 `test_*.js` 归档规则不生效

## 一、Summary
- 目标：排查“`modified` 区出现 `test_*.js`”是否因规则缺失或规则失效，并落地可执行修复方案。
- 范围：两个仓库（`wxappUnpacker`、`reverse_future`），仅约束“归属于 spec/plan 的测试脚本”。
- 结果定义：后续由 AI 生成的 spec/plan 测试脚本，必须放在 `.trae/specs/<change-id>/` 下，不再落到仓库根目录 `test_*.js`。

## 二、Current State Analysis
- 已检索全工作区，未发现你描述的精确规则文本（如 `test_.+\\.js` 必须放置约束）。
- 当前唯一相关规则在 `reverse_future/.trae/rules/spec-plan-rule.md`，内容是“中间脚本和测试文件应放在 `.trae/specs/<change-id>/` 同层”，但未包含：
  - 文件名模式（`test_*.js`）；
  - 违规目录边界（例如仓库根目录）；
  - 执行时机（仅 spec/plan 任务）。
- `wxappUnpacker` 当前不存在 `.trae/rules/` 项目规则文件，导致该仓库缺乏本地显式约束定义。
- 现状取证：
  - `wxappUnpacker` 根目录存在/出现 `test_re.js`、`test_re2.js`、`test_re3.js`、`test_re4.js`（含 untracked）；
  - `reverse_future` 根目录存在 `test_regex.js`（untracked），且仓库内另有 `.trae/specs/remove-t-wrapper/test_regex.js`。
- 规则“不生效”核心原因：
  - 原规则是“行为指导”，不是“文件系统强制器”，不会自动搬迁既有文件；
  - 规则表述过于泛化，缺少可判定条件（命名、目录、触发阶段）；
  - 你口述路径是 `.trae/<change-id>`，而仓库实际规范为 `.trae/specs/<change-id>`，表达不一致增加执行歧义。

## 三、Proposed Changes

### 1) 强化 `reverse_future` 规则文本（从原则变成可执行约束）
- 文件：`/Users/guifengxiao/gitstore/unpacker_workspace/reverse_future/.trae/rules/spec-plan-rule.md`
- 改动：
  - 增加“仅针对 spec/plan 归属脚本”的显式范围；
  - 增加命名约束：`test_*.js` 若用于 spec/plan，必须放 `.trae/specs/<change-id>/`；
  - 增加违规判定：仓库根目录出现新的 spec/plan `test_*.js` 视为违规。
- Why：让 AI 执行时有明确、可判定、可审计的判断标准。
- How：在原规则第 1 条下补充子条款，保持现有语言风格与中文文案一致。

### 2) 在 `wxappUnpacker` 建立同等项目规则
- 文件：`/Users/guifengxiao/gitstore/unpacker_workspace/wxappUnpacker/.trae/rules/spec-plan-rule.md`（新建）
- 改动：
  - 同步 `reverse_future` 的强化规则，避免跨仓库行为不一致。
- Why：你要求“两仓库都要”，且当前仓库本地规则缺失。
- How：创建最小规则集，不覆盖既有 AGENTS 规范，仅补齐 test 脚本归档约束。

### 3) 执行流程增加“写前路径校验”
- 文件：同上两个 `spec-plan-rule.md`
- 改动：
  - 增加操作步骤：生成 `test_*.js` 前先确定 `change-id`，路径固定到 `.trae/specs/<change-id>/`；
  - 无 `change-id` 时，禁止创建 `test_*.js`，先补建对应 spec 目录。
- Why：把“路径约束”前置到创建动作，减少事后进入 modified 区的问题。
- How：以规则条款形式声明，不引入额外脚本机制（按你的选择，仅 AI 规则 + 路径约束）。

### 4) 对历史遗留文件做归属甄别（非自动迁移）
- 文件（排查对象）：
  - `/Users/guifengxiao/gitstore/unpacker_workspace/wxappUnpacker/test_re.js`
  - `/Users/guifengxiao/gitstore/unpacker_workspace/wxappUnpacker/test_re2.js`
  - `/Users/guifengxiao/gitstore/unpacker_workspace/wxappUnpacker/test_re3.js`
  - `/Users/guifengxiao/gitstore/unpacker_workspace/wxappUnpacker/test_re4.js`
  - `/Users/guifengxiao/gitstore/unpacker_workspace/reverse_future/test_regex.js`
- 改动策略：
  - 仅迁移“可确认归属于某个 spec/plan change-id”的脚本到对应 `.trae/specs/<change-id>/`；
  - 非 spec/plan 调试脚本不纳入本规则，保持原位置或另行约定目录。
- Why：你明确“仅处理归属于 spec/plan 的测试脚本”。
- How：在实施阶段按脚本用途逐个判定后再迁移。

## 四、Assumptions & Decisions
- 决策：作用仓库为两个仓库同时生效。
- 决策：采用“AI 规则 + 路径约束”，不引入 Git Hook 硬拦截。
- 决策：规范路径统一为 `.trae/specs/<change-id>/`（不使用 `.trae/<change-id>`）。
- 决策：约束范围是“仓库根目录 `test_*.js`”，且仅针对 spec/plan 归属脚本。
- 假设：现有根目录 `test_*.js` 中可能包含非 spec/plan 调试脚本，需在实施时人工判定归属。

## 五、Verification Steps
1. 规则文件校验：
   - 两仓库都存在并包含“`test_*.js` + `.trae/specs/<change-id>/` + 仅 spec/plan”三类关键条款。
2. 行为校验（正例）：
   - 发起一个新 spec/plan 任务，生成测试脚本时应直接落在 `.trae/specs/<change-id>/`。
3. 行为校验（反例）：
   - 若尝试在仓库根目录创建 spec/plan `test_*.js`，流程应先改写到对应 change-id 目录。
4. modified 区校验：
   - 后续任务中，根目录不再新增 spec/plan 归属的 `test_*.js`。
5. 遗留文件校验：
   - 对当前根目录 `test_*.js` 逐项打标“spec/plan 归属/非归属”，只迁移归属明确的脚本。

