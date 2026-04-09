# 修复代码审查发现的问题 — 实现计划

## Summary

根据代码审查报告，本次计划针对 1 个 Critical 问题和 3 个 Improvement 项进行修复。核心是消除 `buildGroupContent` 中 `indexOf` 返回值语义不清晰导致的索引偏差隐患，以及为关键函数补充 JSDoc、提升可维护性。

## Current State Analysis

当前代码存在以下问题：

| 编号 | 级别 | 位置 | 问题描述 |
|------|------|------|----------|
| C1 | Critical | wuRestoreZ.js#L20,L24 | `endPtr = indexOf(...)` 返回 marker 起始索引，但 `slice(start, end)` 的 end 参数语义不清晰；当前因拼接巧合等价于旧代码，但给维护者造成误解 |
| I1 | Improvement | wuRestoreZ.js#L143-L151 | `merge2ZGroups` 传入累积的 `zGroupMap`，`!Object.keys(zGroupMap).length` 空检查会误判已有多 pattern 场景 |
| I2 | Improvement | wuRestoreZ.js#L45-L59 | `catchZGroup` 原有的 key 归一化注释被删除，新 `keyRegex` 参数对外是黑盒 |
| I3 | Improvement | wuWxml.js#L11-L23 | `resolveZMulName` 缺少 JSDoc，四套正则的优先级和适用场景不明确 |

## Proposed Changes

### 1. wuRestoreZ.js — 消除索引语义歧义 + 补充 JSDoc

**文件**：`wuRestoreZ.js`

#### 1.1 抽取 IIFE 结束 marker 为常量

新增模块级常量，消除硬编码字符串：

```javascript
// 在文件顶部 debugPrefixes 之后新增
const IIFE_END_MARKER = "})(__WXML_GLOBAL__.ops_cached.$gwx";
```

#### 1.2 重构 `buildGroupContent`，显式注释索引语义

```javascript
function buildGroupContent(code, preStr, patternType) {
    let content = code.slice(code.indexOf(preStr));
    // 定位 IIFE 体的开始位置 "(function(z){var a=11;"
    const startPtr = content.indexOf("(function(z){var a=11;");
    // endMarkerPos = marker 串的起始索引（即 '}' 的位置）
    // slice(start, end) 的 end 是不包含截断点，故后面手动拼接 "})(z);"
    const endMarkerPos = content.indexOf(IIFE_END_MARKER);
    if (startPtr === -1 || endMarkerPos === -1) {
        throw new Error(`[restoreZ] ${patternType} 片段截取失败: ${preStr}`);
    }
    return content.slice(startPtr, endMarkerPos) + "})(z);";
}
```

#### 1.3 为 `extractZGroupMap` 补充 JSDoc

```javascript
/**
 * 在 VM 沙箱中批量提取 gz$gwx... 分组的 Z 数组
 * @param {string} code - 完整源代码
 * @param {string[]} groupPreStr - 正则匹配到的函数头列表
 * @param {Object} opts
 * @param {string} opts.patternType - 模式标识，用于日志和错误信息
 * @param {RegExp} opts.keyRegex - 从函数头中提取 key 的正则，捕获组 1 为归一化 key
 * @returns {Object} zArr - { [归一化key]: Z数组 }
 */
function extractZGroupMap(code, groupPreStr, {patternType, keyRegex}) {
    // ...
}
```

#### 1.4 为 `catchZGroup` 补充 key 归一化说明

修改 `catchZGroup` 的 JSDoc：

```javascript
/**
 * 提取旧版小程序 WXML 编译函数组（无 XC 标识）
 * 匹配模式：function gz$gwx(\d*_\d+)
 * Key 归一化策略：统一取末尾数字段，支持 gz$gwx_1 和 gz$gwx1_2 两种旧式命名
 * @param {string} code - 完整源代码
 * @param {string[]} groupPreStr - 匹配到的函数头列表
 * @param {function} cb - 回调函数
 */
```

#### 1.5 将"未命中检查"从 `catchZ` 层下沉到 `extractZGroupMap` 内部

在 `extractZGroupMap` 的循环末尾增加空结果检测：

```javascript
// 在 zArr[matched[1]] = z; 之后，console.log 之前新增
if (groupPreStr.length > 0 && Object.keys(zArr).length === 0) {
    throw new Error(`[restoreZ] ${patternType} 提取结果为空`);
}
```

从 `catchZ` 中删除各 pattern 的 `!Object.keys(zGroupMap).length` 冗余检查（保留 `groupMatch !== null` 判断即可）。

### 2. wuWxml.js — 补充 `resolveZMulName` JSDoc

**文件**：`wuWxml.js`

```javascript
/**
 * 将 gz$gwx... 函数名归一化为 zMulName
 * 优先级从高到低：
 *   1. gz$gwx_wx<AppId(16)>_XC_<n>_1  → 取 n（AppId固定16位）
 *   2. gz$gwx_wx<AppId>+_<n>(_m)?     → 取 n（插件可选双段编号）
 *   3. gz$gwx[_]<n>_<m>               → 取 n_m（XC 双段号）
 *   4. gz$gwx[_]<n>                    → 取 n（纯数字）
 * @param {string} funName - callee.name
 * @returns {string|null} - 归一化后的 key，或 null（未知格式）
 */
function resolveZMulName(funName) {
```

## Assumptions & Decisions

- 决策：索引语义问题通过显式注释和变量命名（`endMarkerPos`）修复，不改变拼接行为，以保持与旧代码的行为完全等价。
- 决策：空结果检测下沉到 `extractZGroupMap`，因为它才是实际执行提取并可能失败的单元。
- 决策：JSDoc 使用中文，与项目其他注释保持一致。
- 假设：当前 vm2 沙箱执行路径不变，修改不引入新的异常抛出点（除了已在计划中显式声明的）。

## Verification Steps

- [ ] `node -e "require('./wuRestoreZ.js'); require('./wuWxml.js'); console.log('ok')"` 验证模块加载
- [ ] 运行样例包解包，确认 `pattern=legacy matched=4 keys=1,2,3,4` 日志正常输出
- [ ] 对比修改前后日志输出，确认诊断信息一致（无新增报错）
- [ ] 审查所有新增注释，确保无遗漏的硬编码字符串

## Files to Modify

- `wuRestoreZ.js` — 第 1-43 行（常量抽取、JSDoc、索引注释），第 143-160 行（删除冗余检查）
- `wuWxml.js` — 第 11-23 行（新增 JSDoc）
