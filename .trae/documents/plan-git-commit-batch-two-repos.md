# 双仓库批量 Git 提交执行计划（以 `.trae/<change-id>` 为入口）

## Summary
- 目标：按你的规则自动化完成两仓库提交，优先以 `.trae/<change-id>` 为入口，将文档与相关代码一并提交；随后整理剩余文件按相关性提交；临时文件先列清单并经你确认后再处理。
- 范围：`reverse_future` + `wxappUnpacker`。
- 已确认偏好：
  - 两仓库都处理；
  - `reverse_future` 的 `change-id` 采用“按目录批量”；
  - 先并行规划，再顺序执行；
  - 剩余文件“尽量单次合并”。

## Current State Analysis
- `wxappUnpacker` 当前变更（关键）：
  - `.trae` 仅新增：`.trae/documents/plan-apply-log-refactor-to-reverse-future.md`
  - 还存在非 `.trae` 文件与临时产物：`new_code_before.js`、`new_code_after.js`、`fallback_case_dir*/`、`regression_tmp/`、`logs/`、`test_re*.js`、`unknown_callee.log`、`wxml_error.log` 等。
- `reverse_future` 当前变更（关键）：
  - `.trae` 下存在大量新增 specs/documents/rules/skills（多 `change-id` 并行未提交）。
  - 代码侧存在 `commander/*`、`scripts/*`、`package*.json`、`scripts_vue3/*` 等混合改动。
  - `.gitignore` 已包含 `logs/`（需纳入本轮提交分组判断）。
- 关键风险：
  - 目前变更跨主题、跨时间，若不先分组会导致“单次提交语义混乱”；
  - 临时文件与调试产物混入提交风险高。

## Proposed Changes

### 1) 建立统一分组清单（先规划，不提交）
- 仓库：`reverse_future`、`wxappUnpacker`
- 动作：
  - 用 `git status --porcelain` + `git diff --name-only` 拉取完整变更清单；
  - 将文件打上分组标签：
    - `G1-change-id-batch`：`.trae/specs/*` 与同主题代码；
    - `G2-doc-plus-code`：`.trae/documents/*` + 对应业务代码；
    - `G3-leftover`：剩余可归并文件（尽量单次合并）；
    - `TMP`：临时/调试文件（本轮仅列清单，待你确认）。

### 2) 以 `.trae/<change-id>` 批量入口执行（reverse_future）
- 入口策略：按目录批量处理 `.trae/specs/*`（你已确认）。
- 规则：
  - 每个 `change-id` 优先尝试关联代码同提交（基于文件名关键字、近期 diff、目录约束）；
  - 如关联不明确，先纳入“批量文档提交组”，后续再并入剩余代码合并组。
- 产出：
  - 至少 1 个“批量 change-id 文档+代码”提交（Conventional Commits，由 `git-commit` 技能生成）。

### 3) 处理 `wxappUnpacker` 的 `.trae` 入口组
- 入口对象：
  - `.trae/documents/plan-apply-log-refactor-to-reverse-future.md`
- 规则：
  - 若有明确相关代码（例如本轮 `reverse_future` 联动日志改造已在另一仓库），本仓库可仅提交该文档；
  - 若本仓库尚有功能性代码改动需同批，按“尽量单次合并”并入 `G3-leftover`。

### 4) 剩余文件整理提交（两仓库，尽量单次）
- 策略：
  - 在不破坏语义前提下，尽量将剩余“非临时”改动合并为少量提交；
  - 若发现明显不相关主题（例如“vue3 转换脚本”与“unpack 日志策略”），拆成独立提交以保证可追溯。
- 提交方式：
  - 全部通过 `git-commit` 技能执行，自动生成 Conventional Commit message。

### 5) 临时文件处理（先列清单，等你确认）
- `wxappUnpacker` 暂定 `TMP`：
  - `fallback_case_dir/`
  - `fallback_case_dir2/`
  - `regression_tmp/`
  - `logs/`
  - `test_re.js`
  - `test_re2.js`
  - `test_re3.js`
  - `test_re4.js`
  - `unknown_callee.log`
  - `wxml_error.log`
  - `new_code_before.js`（需你确认是否保留入库）
  - `new_code_after.js`（需你确认是否保留入库）
- `reverse_future` 暂定 `TMP`：
  - `.DS_Store`
  - `temp/`
  - `test_prettier_fix/`
  - `test_prettier_fix_2/`
  - `test_regex.js`
  - `scripts_vue3/test_sr_regex.js`
  - `commander/repro_bundle.js`（若用于复现可保留，否则归 TMP）
- 执行规则：
  - 本阶段仅“列出并标注建议”；不删除、不提交，等待你确认后再执行。

## Assumptions & Decisions
- 决策：优先保证“提交语义清晰”与“尽量少提交次数”平衡，必要时允许拆分 2~3 个提交。
- 决策：`reverse_future` 大量 `.trae/specs/*` 采用批量入口而非逐个问询，提高执行效率。
- 假设：你认可“临时文件必须二次确认后处理”，未确认前默认不纳入提交。
- 假设：自动提交动作统一走 `git-commit` 技能，不手写 `git commit` message。

## Verification Steps
- 提交前校验：
  - 每个提交组先 `git diff --name-only --cached` 复核文件边界；
  - 确认无 `TMP` 混入（除非你显式同意）。
- 提交后校验：
  - `git log -n <N> --oneline` 检查提交序列和 message 语义；
  - `git status --short` 确认仅剩待确认 `TMP` 或你指定保留项。

## 计划执行顺序
1. 生成两仓库“分组清单草案”（含 `TMP` 建议）。
2. 先执行 `reverse_future` 的 `.trae/specs` 批量入口提交。
3. 执行 `wxappUnpacker` 的 `.trae` 入口提交。
4. 对两仓库剩余非临时文件执行“尽量单次合并”提交。
5. 将 `TMP` 清单回传你确认，再执行对应处理（提交/保留/忽略）。
