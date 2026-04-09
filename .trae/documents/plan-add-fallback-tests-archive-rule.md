# 计划：补充无归属 `test(_.+)?\.js` 的统一归档规则

## 一、Summary
- 目标：在现有规则基础上补充“无明确归属的 `test(_.+)?\.js` 统一归档到各仓库根目录 `tests/`”的兜底机制。
- 作用范围：`wxappUnpacker` 与 `reverse_future` 两个仓库。
- 结果定义：后续新建测试脚本时，优先落到 `.trae/specs/<change-id>/`；若无法判定归属，则统一落到 `<repo>/tests/`，不再散落到仓库根目录。

## 二、Current State Analysis
- 两仓库当前规则已包含：
  - Spec/Plan 归属测试脚本必须放 `.trae/specs/<change-id>/`；
  - 根目录新建 Spec/Plan `test_*.js` 视为违规；
  - 无 `change-id` 时禁止创建 Spec/Plan `test_*.js`。
- 两仓库当前规则未包含“无明确归属脚本的兜底目录”定义。
- 目录现状：
  - `wxappUnpacker` 当前无根目录 `tests/`。
  - `reverse_future` 存在 `.trae/specs/.../tests/`（归属于具体 change-id），但无统一根目录 `tests/`。
- 根目录现有测试脚本样本：
  - `wxappUnpacker/test_re.js`、`test_re2.js`、`test_re3.js`、`test_re4.js`、`test.js`
  - `reverse_future/test_regex.js`

## 三、Proposed Changes

### 1) 补充 `wxappUnpacker` 规则中的“无归属兜底”条款
- 文件：`/Users/guifengxiao/gitstore/unpacker_workspace/wxappUnpacker/.trae/rules/spec-plan-rule.md`
- 改动内容：
  - 新增条款：对命名匹配 `test(_.+)?\\.js` 且无法明确归属到某个 `change-id` 的脚本，统一放置于仓库根目录 `tests/`。
  - 新增条款：根目录出现未归档的无归属 `test(_.+)?\\.js` 视为待整理项，需迁移至 `tests/`。
- Why：将“禁止根目录散落”从仅 Spec/Plan 扩展到无归属脚本，形成完整归档闭环。
- How：在第 1 条规则下增加 1-2 条兜底子规则，维持现有中文规范风格。

### 2) 补充 `reverse_future` 规则中的同等兜底条款
- 文件：`/Users/guifengxiao/gitstore/unpacker_workspace/reverse_future/.trae/rules/spec-plan-rule.md`
- 改动内容：与 `wxappUnpacker` 同步新增“无归属 -> `<repo>/tests/`”条款。
- Why：两仓库行为一致，避免规则分叉。
- How：保持规则编号结构与措辞一致，仅补充兜底逻辑。

### 3) 建立两仓库根目录 `tests/`（如不存在）
- 文件/目录：
  - `/Users/guifengxiao/gitstore/unpacker_workspace/wxappUnpacker/tests/`（新建）
  - `/Users/guifengxiao/gitstore/unpacker_workspace/reverse_future/tests/`（新建）
- 改动内容：创建统一归档目录。
- Why：为“无归属脚本”提供稳定、可预期的落盘位置。
- How：仅建目录，不引入额外脚本工具。

### 4) 迁移当前根目录中“无明确归属”的 `test*.js`
- 迁移对象（初始清单）：
  - `wxappUnpacker`：`test_re.js`、`test_re2.js`、`test_re3.js`、`test_re4.js`、`test.js`
  - `reverse_future`：`test_regex.js`
- 改动内容：
  - 若可证明属于某个 change-id：迁移到 `.trae/specs/<change-id>/`。
  - 若无法证明归属：迁移到 `<repo>/tests/`。
- Why：清理历史遗留，消除 `modified` 区根目录散点脚本。
- How：逐文件判定归属并迁移，必要时保留文件名并仅调整路径。

## 四、Assumptions & Decisions
- 决策：兜底目录固定为“各仓库根目录 `tests/`”。
- 决策：命名匹配使用 `test(_.+)?\\.js`，覆盖 `test.js` 与 `test_xxx.js`。
- 决策：规则优先级为：
  - 先判定是否归属 Spec/Plan change-id；
  - 可归属则进入 `.trae/specs/<change-id>/`；
  - 不可归属则进入 `<repo>/tests/`。
- 假设：历史脚本中存在无法准确回溯来源的临时脚本，按兜底目录处理可接受。

## 五、Verification Steps
1. 规则文本校验：
   - 两仓库规则文件均包含 `test(_.+)?\\.js` 与“无归属 -> `<repo>/tests/`”条款。
2. 目录校验：
   - 两仓库根目录均存在 `tests/`。
3. 新增脚本行为校验：
   - 新建可归属脚本时落在 `.trae/specs/<change-id>/`。
   - 新建不可归属脚本时落在 `<repo>/tests/`，不落根目录。
4. 遗留脚本校验：
   - 根目录原 `test*.js` 清单已按“归属优先、无归属兜底”完成迁移。
5. 回归校验：
   - 后续任务中根目录不再新增无归档 `test*.js`。

