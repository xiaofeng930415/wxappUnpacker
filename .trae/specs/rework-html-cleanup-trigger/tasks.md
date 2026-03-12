# Tasks
- [x] Task 1: 重构清理触发入口，建立主链路与兜底链路
  - [x] SubTask 1.1: 梳理 `doFile`、`packDone`、`_cb` 当前调用关系与早退分支
  - [x] SubTask 1.2: 设计并实现独立的清理调度函数，避免重复触发
  - [x] SubTask 1.3: 将 `-o`、`-d` 参数语义纳入调度判定

- [x] Task 2: 强化清理执行可观测性
  - [x] SubTask 2.1: 为清理流程增加“触发/跳过/完成/失败”结构化日志
  - [x] SubTask 2.2: 输出关键上下文（目标目录、参数状态、失败原因）
  - [x] SubTask 2.3: 保证失败信息不会被静默吞掉

- [x] Task 3: 校准 `.html` 删除行为并验证路径覆盖
  - [x] SubTask 3.1: 复核 `utils/del.js` 中 `.html` 匹配策略在多目录结构下的覆盖性
  - [x] SubTask 3.2: 在终端执行 `wuWxapkg.js` 进行真实链路验证
  - [x] SubTask 3.3: 用日志与文件结果双重确认 `.html` 删除生效

- [x] Task 4: 回归验证四个用户指定搜索范围中的样本输出
  - [x] SubTask 4.1: 对 `reverse_future` 相关输出目录执行抽样检查
  - [x] SubTask 4.2: 对 `wxappUnpacker` 测试目录执行抽样检查
  - [x] SubTask 4.3: 对 `shyd_mp`、`ttt` 目录执行抽样检查并记录差异

- [x] Task 5: 修复终端验证中清理时序导致的解包失败
  - [x] SubTask 5.1: 分析 `cleanup source=fallback` 触发时点与 `packDone` 依赖关系
  - [x] SubTask 5.2: 调整清理触发时序避免 `appservice.js` 在后续读取前被删除
  - [x] SubTask 5.3: 复测 `pkg.wxapkg` 确认删除生效且进程正常退出

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 1
- Task 4 depends on Task 3
- Task 5 depends on Task 3

# Verification Notes
- 终端命令：`node wuWxapkg.js test_verify_fix/pkg.wxapkg`
- 终端命令：`node wuWxapkg.js -d test_verify_fix/pkg.wxapkg`
- 终端命令：`node wuWxapkg.js -o test_verify_fix/pkg.wxapkg`
- 人工注入样本：`test_verify_fix/pkg/终端验证.html`
- 清理日志命中：`[cleanup] {"stage":"triggered",...,"source":"fallback"}` 与 `[cleanup] {"stage":"finished",...,"deletedCount":29}`
- 注入样本结果：`test_verify_fix/pkg/终端验证.html` 已被删除（`DELETED`）
- `-d` 语义结果：命中 `[cleanup] {"stage":"skip",...,"reason":"skip_by_option_d"}`，且注入样本仍保留（`EXISTS`）
- `-o` 语义结果：命中 `[cleanup] {"stage":"skip",...,"reason":"skip_by_option_o"}`，且无需进入 `packDone` 链路
- 四目录抽样统计：
  - `reverse_future`：HTML_COUNT=82
  - `wxappUnpacker`：HTML_COUNT=1
  - `shyd_mp`：HTML_COUNT=0
  - `ttt`：HTML_COUNT=54
- 修复结果：`node wuWxapkg.js test_verify_fix/pkg.wxapkg` 正常退出（exit code 0），未再出现 `ENOENT ... /test_verify_fix/pkg/appservice.js`
