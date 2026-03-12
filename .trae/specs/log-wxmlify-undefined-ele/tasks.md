# Tasks
- [ ] Task 1: 梳理 wxmlify(undefined/null) 触发路径与上下文来源
  - [ ] 1.1: 确认 `elemToString()` 内所有 `wxmlify()` 调用点与参数现状
  - [ ] 1.2: 明确需要透传的最小上下文字段（元素、属性名、深度、wxml 文件名、模板名）
- [ ] Task 2: 扩展 wxmlify 参数并实现独立日志写入
  - [ ] 2.1: 调整 `wxmlify(str, isText, ele, ctx)`（或等价签名），补齐 `isText` 缺省值逻辑
  - [ ] 2.2: 实现“安全元素摘要”生成（限制字段与长度，避免循环引用）
  - [ ] 2.3: 实现 JSONL 追加写入 `wxmlify_undefined.log`，并保证写入失败不影响流程
- [ ] Task 3: 在 elemToString/doWxml/tryWxml 中打通上下文传递
  - [ ] 3.1: 属性序列化处传入 `ele` 与 `attrName`
  - [ ] 3.2: 从 `doWxml()` 传入 `wxmlFile/template` 等上下文到 `elemToString()`，递归时保持一致
- [ ] Task 4: 增加最小化手工验证路径
  - [ ] 4.1: 构造一个包含 `undefined` 属性值的最小元素树，执行 `elemToString()` 验证不崩溃
  - [ ] 4.2: 验证生成/追加 `wxmlify_undefined.log` 且包含期望字段
  - [ ] 4.3: 运行 `node test.js` 或对一个样例 `.wxapkg` 执行解包流程，确认无回归

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 2
- Task 4 depends on Task 3
