# wuRestoreZ.catchZ 等价重构 Spec

## Why
`wuRestoreZ.js` 的 `catchZ()` 同时承担：
- 多种 `gz$gwx*` 分组模式的 Z 提取（含插件分支开关与诊断日志）
- 未命中分组时的回退提取（从 `ops_set.$gwx` 截取可执行片段并在 VM 中运行）

现有实现可工作，但局部变量语义不清、嵌套与分支读起来偏“跳跃”，不利于后续追加新模式与排障。

## What Changes
- 对 `catchZ()`（约 L82-155）做等价重构：
  - 保持 `module.exports.getZ(code, cb, targetType)` 接口与行为不变
  - 保持现有日志输出与正则覆盖不变
  - 使用 guard clauses 降低嵌套
  - 局部变量与局部函数语义化命名，并补充必要注释解释分支意图
- 补充最小 smoke 验证脚本/命令：
  - 覆盖分组命中
  - 覆盖 plugin 开关（miniapp 不匹配插件分组 / plugin 匹配插件分组）
  - 覆盖回退路径（不抛异常）

## Non-Goals
- 不改动任何正则表达式内容
- 不调整现有日志文案与参数含义
- 不重构 `catchZGroup*()` / `restoreAll()` 等其它逻辑

