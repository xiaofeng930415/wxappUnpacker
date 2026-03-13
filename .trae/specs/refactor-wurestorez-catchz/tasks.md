# Tasks
- [x] Task 1: 等价重构 catchZ 并降低嵌套
  - [x] 不改动 `getZ` 导出接口与行为
  - [x] 保持现有日志与正则覆盖不变
  - [x] 使用 guard clauses 扁平化控制流并语义化命名

- [x] Task 2: 增加最小 smoke 验证脚本
  - [x] 覆盖分组命中路径
  - [x] 覆盖 plugin 开关路径
  - [x] 覆盖回退路径不抛异常
  - [x] 运行命令：`node .trae/specs/refactor-wurestorez-catchz/smoke.js`
