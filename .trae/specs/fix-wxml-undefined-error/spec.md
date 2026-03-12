# Unknown Init Callee 日志记录增强 Spec

## 为什么

目前当 `wuWxml.js` 中遇到 `Error: Unknown init callee` 错误时，虽然会在控制台输出错误并生成 `.ori.js` 调试文件，但控制台信息可能被后续输出淹没，且 `.ori.js` 文件只包含原始代码，缺乏当时的环境变量和具体的错误栈信息。
为了更好地排查和适配新的微信小程序编译模式，需要将详细的报错日志和执行信息持久化保存到一个 `.log` 文件中。

## 变更内容

* **修改** **`wuWxml.js`**：

  * 在 `tryWxml` 函数的 `catch` 块中，检测错误信息是否包含 `Unknown init callee`。

  * 如果匹配，除了原有的处理（如生成 `.ori.js`），还将详细的日志信息追加写入到 `dir` 父级目录下的 `unknown_callee.log` 文件中。

  * 日志内容应包含：

    * 时间戳

    * 错误发生的目录 (`dir`)

    * 文件名 (`name`)

    * 完整的错误栈 (`e.stack`)

    * 相关的变量值（如 `funName`, `zMulName` 等，如果能在错误对象中获取或传递）。

## 影响范围

* **受影响的代码**: `wuWxml.js` 中的 `tryWxml` 函数。

* **受影响的功能**: 仅影响反编译失败时的错误处理逻辑，正常流程不受影响。

* **文件生成**: 会在 `dir` 的父级目录下生成 `unknown_callee.log` 文件。

## 新增需求

### Requirement: 持久化日志记录

当 `wuWxml.js` 捕获到 `Unknown init callee` 错误时，系统必须将详细的上下文信息记录到日志文件。

#### 场景: 遇到未知初始化函数

* **WHEN**: `doWxml` 执行过程中抛出包含 "Unknown init callee" 的错误。

* **THEN**:

  * 系统生成或追加内容到 `dir` 父级目录下的 `unknown_callee.log`。

  * 日志条目包含：当前时间、文件路径、错误消息及堆栈信息。

  * 原有的 `.ori.js` 生成逻辑保持不变。

