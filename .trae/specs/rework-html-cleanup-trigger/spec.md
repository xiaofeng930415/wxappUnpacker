# 终端执行下 .html 清理触发重构 Spec

## Why
当前已存在的 `.html` 删除规则在终端实测中未稳定生效，表现为清理函数未被调用，导致解包目录残留冗余 `.html` 文件。需要将清理触发从“单点回调依赖”调整为“可观测、可兜底”的流程，确保命令行执行结果一致。

## What Changes
- 重构清理触发时机，避免仅依赖 `packDone -> cb -> del.doDel` 单一链路。
- 增加清理执行状态日志，输出“触发、跳过、完成、失败”四类关键事件。
- 统一 `-o`、`-d`、普通解包三种模式下的清理策略与预期行为。
- 为 `.html` 删除增加端到端终端验证步骤，覆盖 `wxappUnpacker` 与用户给定样本目录场景。

## Impact
- Affected specs: 解包后清理流程、终端可观测性、`.html` 冗余文件治理
- Affected code: `wuWxapkg.js`、`utils/del.js`、必要的验证脚本/日志输出路径

## ADDED Requirements
### Requirement: 清理触发必须具备兜底路径
系统 SHALL 在解包流程结束时保证至少一次清理判定，即使主回调链路异常或提前返回，也能执行可控的兜底清理策略。

#### Scenario: 主链路正常完成
- **WHEN** 解包流程按预期完成且未启用跳过清理参数
- **THEN** 系统在收尾阶段触发 `.html` 清理并输出完成日志

#### Scenario: 主链路未到达回调
- **WHEN** 主链路未能到达既有清理回调节点
- **THEN** 系统触发兜底清理判定，保证 `.html` 清理仍可执行或明确记录跳过原因

### Requirement: 清理策略必须与参数语义一致
系统 SHALL 明确 `-o` 与 `-d` 对清理行为的影响并在日志中可追踪。

#### Scenario: 传入 -d
- **WHEN** 用户传入 `-d` 参数
- **THEN** 系统跳过删除动作并记录“由参数跳过清理”

#### Scenario: 传入 -o
- **WHEN** 用户传入 `-o` 参数
- **THEN** 系统仍执行独立的清理策略判定，并记录“非后处理模式下的清理决策”

### Requirement: 终端执行必须可验证
系统 SHALL 在终端运行日志中提供可检索的关键字，支持确认 `del.doDel` 是否被调用及其结果。

#### Scenario: 清理已执行
- **WHEN** 清理流程成功执行
- **THEN** 日志包含“cleanup triggered”和“cleanup finished”同一批次标记

#### Scenario: 清理失败
- **WHEN** 清理过程中出现异常
- **THEN** 日志包含失败原因和影响文件范围，且不吞掉异常上下文

## MODIFIED Requirements
### Requirement: 解包收尾触发机制
系统原有“仅在 `packDone` 回调触发清理”的机制调整为“主链路优先 + 兜底判定”的双轨触发机制，以提高终端执行稳定性与可观测性。
