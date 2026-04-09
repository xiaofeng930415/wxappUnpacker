# 计划：Trae 中保留 `.gitignore` 但不在文件管理器隐藏文件

## 一、Summary
- 目标：在 **不改变 Git 忽略策略** 的前提下，让被 `.gitignore` 命中的日志/临时文件仍在 Trae 文件管理器可见。
- 关键方案：使用全局用户设置将 `explorer.excludeGitIgnore` 设为 `false`，而不是修改仓库内 `.gitignore`。
- 决策约束：由于 Trae 代码索引默认遵循 `.gitignore`，本计划明确优先“保留 `.gitignore`”，因此这些文件仍不会进入 AI 索引。

## 二、Current State Analysis
- 当前仓库存在 `.gitignore`，包含日志与临时文件规则（如 `日志_**.**`、`logs/unpack-20260409.log`）。
- 当前工作区 `.vscode/settings.json` 未配置 `explorer.excludeGitIgnore`。
- 机器上已发现 Trae 用户级设置文件：
  - `/Users/guifengxiao/Library/Application Support/Trae/User/settings.json`
  - `/Users/guifengxiao/Library/Application Support/Trae CN/User/settings.json`
- 在 `Trae/User/settings.json` 中已存在 `explorer.excludeGitIgnore: true`，这会导致 `.gitignore` 文件在 Explorer 中被隐藏。
- Trae 文档约束：代码索引会默认应用 `.gitignore`，`.trae/.ignore` 仅是补充忽略规则而非反向包含规则。

## 三、Proposed Changes

### 1) 修改 Trae 全局用户设置（主客户端）
- 文件：`/Users/guifengxiao/Library/Application Support/Trae/User/settings.json`
- 变更内容：
  - 将 `"explorer.excludeGitIgnore": true` 改为 `"explorer.excludeGitIgnore": false`。
- Why：
  - 直接解除 Explorer 对 `.gitignore` 命中项的隐藏。
- How：
  - 仅调整该单一键值，保持其他个性化配置不变。

### 2) 同步 Trae CN 用户设置（如你使用 Trae CN）
- 文件：`/Users/guifengxiao/Library/Application Support/Trae CN/User/settings.json`
- 变更内容：
  - 若文件中存在该项则设为 `false`；不存在则新增 `"explorer.excludeGitIgnore": false`。
- Why：
  - 避免中英文版本客户端切换时出现行为不一致。
- How：
  - 保持 JSON 结构与现有风格一致，最小化改动。

### 3) 保持仓库 `.gitignore` 不变
- 文件：`/Users/guifengxiao/gitstore/unpacker_workspace/wxappUnpacker/.gitignore`
- 变更内容：不改动。
- Why：
  - 你已确认优先保留 `.gitignore` 规则，避免日志/临时文件进入版本控制。
- How：
  - 不迁移规则到 `.git/info/exclude`，不调整提交策略。

## 四、Assumptions & Decisions
- 决策：生效范围为全局用户级，而非当前仓库级。
- 决策：冲突优先级为“保留 `.gitignore`”。
- 结论：文件管理器可见性与 AI 索引可见性将分离：
  - 文件管理器：可见（通过 `explorer.excludeGitIgnore=false`）。
  - AI 索引：仍忽略（由 `.gitignore` 决定）。
- 兼容性说明（Windows）：
  - 对应路径通常为 `%APPDATA%/Trae/User/settings.json`（以及 `%APPDATA%/Trae CN/User/settings.json`）。

## 五、Verification Steps
1. 关闭并重启 Trae（或使用“Developer: Reload Window”）。
2. 打开被 `.gitignore` 命中的文件目录（例如日志目录），确认在 Explorer 可见。
3. 运行 `git status`，确认这些文件仍为忽略状态且不出现在待提交列表。
4. 在 #Workspace 提问一个仅存在于被忽略日志中的关键字，确认默认检索不到（验证索引仍遵循 `.gitignore`）。
5. 如需再次隐藏 `.gitignore` 命中项，仅将 `explorer.excludeGitIgnore` 改回 `true`。

## 六、风险与回滚
- 风险：Explorer 可见文件增多，目录噪音上升。
- 回滚：将两个用户设置文件中的 `explorer.excludeGitIgnore` 恢复为 `true` 即可。
