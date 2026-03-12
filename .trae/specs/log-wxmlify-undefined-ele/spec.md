# wxmlify(undefined/null) 场景元素上下文日志 Spec

## Why
当前 `wuWxml.js` 在 `wxmlify()` 收到 `undefined/null` 时只打印 `console.trace("str, isText", ...)`，缺少触发该异常值的元素/属性上下文，难以定位是哪一个节点或属性被还原成了 `undefined`，也难以进行批量分析。

## What Changes
- 扩展 `wxmlify()` 的参数：在原有 `str, isText` 基础上，新增传入 `ele`（触发该调用的元素对象）以及可选的上下文字段（如属性名、文件信息、递归深度）。
- 在 `str === undefined || str === null` 时，除了现有返回值策略（仍返回 `"Empty"` 以保证流程不中断），额外将关键信息写入独立日志文件（追加写入，便于收集多次命中）。
- 将 `elemToString()` 里属性序列化处对 `wxmlify()` 的调用改为传入“当前元素”而不是 `elem.v`，并补充属性名，确保日志可反查到具体节点与属性。

## Impact
- Affected specs: WXML 还原时的异常数据定位与可观测性增强
- Affected code: `wuWxml.js`（`wxmlify()`、`elemToString()`、`doWxml()`/`tryWxml()` 的上下文传递）

## ADDED Requirements
### Requirement: 记录 wxmlify(undefined/null) 的元素上下文
系统 SHALL 在 `wxmlify()` 收到 `undefined` 或 `null` 的 `str` 时，向独立日志文件追加一条记录，用于后续分析定位。

#### Scenario: 属性值为 undefined
- **WHEN** `elemToString()` 序列化属性时遇到 `elem.v[attr]` 为 `undefined` 或 `null`
- **THEN** `wxmlify()` 仍返回 `"Empty"`（保持既有容错行为）
- **AND THEN** 日志文件中包含至少以下字段：
  - `timestamp`：ISO 时间
  - `kind`：固定为 `"attr"`
  - `wxmlFile`：当前正在还原的 wxml 文件名/路径（若可得）
  - `template`：模板名（主模板可为空或 `"Main"`）
  - `depth`：递归深度（若可得）
  - `tag`：元素 `tag`
  - `attrName`：属性名
  - `valueType`：`typeof str` 或 `"null"`
  - `eleSummary`：元素摘要（避免过大/循环引用；至少包含 `tag`、`v` 的键列表、`son.length`）

#### Scenario: isText 未传入或异常
- **WHEN** `wxmlify()` 被调用时 `isText` 未传入
- **THEN** 系统 SHALL 将 `isText` 视为 `false`（保持属性转义逻辑一致）
- **AND THEN** 若同时命中 `str` 为 `undefined/null`，日志记录中包含 `isTextProvided: false`

### Requirement: 日志写入不影响还原流程
系统 SHALL 在日志写入失败（例如目录不可写、磁盘满）时不抛出异常中断还原流程；该错误应被吞掉或降级为一次性 `console.error`（避免大量重复打印）。

### Requirement: 独立日志文件
系统 SHALL 将该类记录写入独立文件（不同于现有 `unknown_callee.log`），文件名建议为 `wxmlify_undefined.log`（追加写入，JSON Lines 格式）。

## MODIFIED Requirements
### Requirement: elemToString 属性序列化
`elemToString()` 在序列化属性时 SHALL 把当前 `elem`（而非 `elem.v`）与属性名一并传入 `wxmlify()`，以便发生异常值时日志具备定位能力。

## REMOVED Requirements
（无）
