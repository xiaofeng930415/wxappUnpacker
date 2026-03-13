# 按目标类型控制插件 Z 组匹配 Spec

## Why
当前 `wuRestoreZ.js` 中用于插件场景的 `gz$gwx_wx...` 分组匹配逻辑，会在普通小程序包中干扰 `wxml` 与 `js/json/wxss` 的对应关系。直接移除该逻辑会修复普通小程序，但会导致插件包还原缺失。
前置流程已要求用户选择“普通小程序”或“插件小程序”，因此需要基于该输入进行显式分流，而不是混用两套匹配规则。

## What Changes
- 引入“还原目标类型”运行参数（`miniapp` / `plugin`），并贯穿至 `wuWxml.doFrame()` 与 `wuRestoreZ.getZ()/catchZ()`。
- 在 `catchZ()` 内按目标类型决定是否启用 `gz$gwx_wx[a-z0-9]+_\d+(_\d+)?` 这组插件匹配逻辑。
- 约束默认行为与兼容策略：未显式传参时保持当前默认路径，避免破坏历史脚本调用。
- 增加运行日志输出（目标类型、启用的匹配分支、匹配命中数），用于定位映射偏差。
- 增加最小化回归验证用例：普通小程序模式与插件模式各验证一次。

## Impact
- Affected specs: WXML Z 数据提取与页面还原映射稳定性
- Affected code: `wuWxapkg.js`、`wuWxml.js`、`wuRestoreZ.js`、`bingo.sh`（若该脚本负责传递用户选择）

## ADDED Requirements
### Requirement: 基于目标类型启用插件匹配分支
系统 SHALL 根据“还原目标类型”参数，控制是否执行插件专用 `gz$gwx_wx...` 分组匹配。

#### Scenario: 普通小程序模式
- **WHEN** 目标类型为 `miniapp`
- **THEN** 系统不执行插件专用 `gz$gwx_wx...` 分组匹配
- **AND** `wxml` 与 `js/json/wxss` 的对应关系保持一致

#### Scenario: 插件模式
- **WHEN** 目标类型为 `plugin`
- **THEN** 系统执行插件专用 `gz$gwx_wx...` 分组匹配
- **AND** 插件页面的 `wxml` 还原不缺失

### Requirement: 参数贯通与可观测性
系统 SHALL 将目标类型参数从入口层传递到 `catchZ()` 决策点，并输出最小必要日志用于排障。

#### Scenario: 参数透传完整
- **WHEN** 用户在前置步骤选择了目标类型并执行解包
- **THEN** 入口层将目标类型透传到 WXML 还原链路
- **AND** 日志中可看到目标类型与启用分支信息

## MODIFIED Requirements
### Requirement: `catchZ()` 分组匹配策略
`catchZ()` 的分组匹配策略 SHALL 从“同时尝试多种模式”调整为“基础模式常开 + 插件模式按目标类型开关”。

#### Scenario: 兼容历史调用
- **WHEN** 调用方未传入目标类型参数
- **THEN** 系统采用兼容默认值（保持现有主流程可用）
- **AND** 不因为新增参数导致进程中断
