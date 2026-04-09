# 自动化规则

1. **Spec/Plan 中间文件存放**：所有生成的中间脚本和测试文件**必须**存放在与 plan/spec 文档相同的目录层级（例如 `.trae/specs/<change-id>/`）。严禁将这些文件放入项目源代码区域。
   - 仅当脚本明确归属于 Spec/Plan 任务时，应用本条约束。
   - 对于命名匹配 `test_*.js` 的 Spec/Plan 测试脚本，路径必须为 `.trae/specs/<change-id>/`。
   - 在仓库根目录创建新的 Spec/Plan `test_*.js` 视为违规，必须改写到对应 `change-id` 目录。
   - 生成 `test_*.js` 前必须先确定 `change-id`；若未确定，禁止创建并先补齐对应 Spec 目录。
   - 对于命名匹配 `test(_.+)?\.js` 且无法明确归属到任何 `change-id` 的脚本，统一归档到仓库根目录 `tests/`。
   - 仓库根目录出现未归档的无归属 `test(_.+)?\.js` 视为待整理项，必须迁移到 `tests/`。

2. **文件自动保留**：所有生成的文件**必须**自动保存并保留。**不要**询问确认是否删除或保留文件。

3. **文档语言**：所有 Spec 和 Plan 模式的文档（例如 `spec.md`, `plan.md`, `tasks.md`, `checklist.md`）**必须**使用**中文**（简体中文）编写。
