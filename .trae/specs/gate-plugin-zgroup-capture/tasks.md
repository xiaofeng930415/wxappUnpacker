# Tasks
- [x] Task 1: 设计并接入目标类型参数透传链路
  - [x] 在入口参数中定义目标类型（`miniapp` / `plugin`）读取规则，并保留兼容默认值。
  - [x] 将目标类型从 `wuWxapkg.js` 透传到 `wuWxml.doFrame()`。
  - [x] 将目标类型继续透传到 `wuRestoreZ.getZ()` 与 `catchZ()`。

- [x] Task 2: 按目标类型改造 `catchZ()` 分组策略
  - [x] 保持基础 `gz$gwx*` 与 `_XC_` 相关匹配逻辑不变。
  - [x] 将插件专用 `gz$gwx_wx...` 匹配逻辑置于 `plugin` 模式开关下。
  - [x] 增加最小诊断日志（目标类型、是否启用插件分支、命中数量）。

- [x] Task 3: 完成双模式手工回归验证
  - [x] 使用普通小程序样本执行，确认 `wxml` 与 `js/json/wxss` 对应关系正常。
  - [x] 使用插件样本执行，确认插件页面 `wxml` 不缺失。
  - [x] 记录验证结论与命令，确保后续可复现。

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 2
