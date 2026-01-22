<!--
 * @Author: xiaogf 1021969874@qq.com
 * @Date: 2026-01-22 21:52:44
 * @LastEditors: xiaogf 1021969874@qq.com
 * @LastEditTime: 2026-01-22 21:55:52
 * @FilePath: \unpackMpWorkspace\wxappUnpacker\README_CN.md
-->
# wxappUnpacker

这是一个用于微信小程序 (.wxapkg) 解包及相关文件 (.wxss, .json, .wxs, .wxml) 还原的工具。

> **注意：** 本模块仅包含解包功能，**不包含解密功能**。如果是 PC 端加密包，请先使用解密工具（如 `reverse_future/decrypt`）进行解密。

## 功能特性

- 支持解包 `.wxapkg` 文件。
- 还原小程序源码，包括：
  - `wxml` 还原。
  - `wxss` 还原。
  - `js` 混淆还原（部分）。
  - `json` 配置文件提取。
- 支持分包解包，自动将子包内容合并到主包目录。

## 安装

确保你已安装 Node.js 环境，然后在本项目目录下执行：

```bash
npm install
```

## 使用方法

### 1. 基础解包

使用 `wuWxapkg.js` 直接解包单个文件：

```bash
node wuWxapkg.js <path_to_file.wxapkg>
```

或者使用便捷脚本：
- **Windows:** `bingo.bat <path_to_file.wxapkg>`
- **Linux:** `./bingo.sh <path_to_file.wxapkg>`

### 2. 分包解包

如果小程序包含主包和子包，请先解包主包，然后再解包子包并指定主包目录。

**步骤：**
1. 解包主包：
   ```bash
   node wuWxapkg.js master.wxapkg
   ```
2. 解包子包（使用 `-s` 指定主包解包后的目录）：
   ```bash
   node wuWxapkg.js -s=../master_dir sub.wxapkg
   ```

> **提示：** `-s` 参数推荐使用绝对路径。相对路径的起点是子包解包后的目录。

## 常见路径

- **Android 手机微信包路径：**
  `/data/data/com.tencent.mm/MicroMsg/{User}/appbrand/pkg`
- **Windows PC 微信包路径：**
  `C:\Users\{Username}\Documents\WeChat Files\Applet`

## 依赖库

本项目依赖以下核心库：
- `css-tree`: 用于处理 wxss。
- `cssbeautify`: 格式化 css。
- `esprima`: 用于解析 js。
- `vm2`: 运行沙箱环境以提取样式和模板。
- `js-beautify`: 代码格式化。

---
*基于原始 wxappUnpacker 改进。*
