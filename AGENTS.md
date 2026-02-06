Guidelines for AI agents working in this repository.
# Project Overview
**wxappUnpacker** is a WeChat Mini Program (.wxapkg) unpacker and source code restoration tool. It decompiles WeChat mini-program packages and restores WXML, WXSS, JS, JSON, and WXS files to their original structure.
**Primary Language**: JavaScript (Node.js, CommonJS modules)
**License**: GPL-3.0-or-later
 Quick Reference
 Installation
npm install
Build/Run Commands
# Main unpacker - extracts and restores all file types
node wuWxapkg.js <file.wxapkg>
# Individual processors (rarely needed directly)
npm run pkg    # node wuWxapkg.js - main unpacker
npm run css    # node wuWxss.js  - WXSS processor
npm run xml    # node wuWxml.js  - WXML processor
npm run js     # node wuJs.js    - JS processor
npm run cfg    # node wuConfig.js - config processor
# Convenience scripts
./bingo.sh <file.wxapkg>              # Linux/macOS
./bingo.bat <file.wxapkg>             # Windows
# Sub-package unpacking (when package is a sub-package)
node wuWxapkg.js -s=<main-dir> <sub-package.wxapkg>
Testing
No automated test framework. Manual testing only via test.js.
node test.js  # Manual webpack unpacking test
Linting/Formatting
No ESLint or Prettier configured. Follow existing code patterns.
Architecture
Core Modules (wu* prefix pattern)
| File          | Purpose                                                   |
| ------------- | --------------------------------------------------------- |
| wuWxapkg.js   | Main entry point - orchestrates unpacking pipeline        |
| wuLib.js      | Shared utilities (file I/O, path handling, async helpers) |
| wuWxml.js     | WXML restoration from compiled JavaScript                 |
| wuWxss.js     | WXSS (CSS) restoration                                    |
| wuJs.js       | JavaScript deobfuscation and beautification               |
| wuConfig.js   | app-config.json processing and splitting                  |
| wuRestoreZ.js | Z-data restoration utilities                              |
Supporting Modules
| Directory/File | Purpose                               |
| -------------- | ------------------------------------- |
| wxss/          | WXSS processing sub-modules           |
| utils/         | General utilities (file ops, cleanup) |
| commander/     | CLI configuration                     |
Data Flow
.wxapkg file
    ↓
wuWxapkg.js (header parsing, file extraction)
    ↓
┌─────────────────────────────────────────┐
│  Parallel Processing:                    │
│  - wuConfig.js → app.json, page configs │
│  - wuJs.js → .js files                  │
│  - wuWxml.js → .wxml files              │
│  - wuWxss.js → .wxss files              │
└─────────────────────────────────────────┘
    ↓
Restored mini-program source
Code Style Guidelines
Module Pattern
- Use CommonJS (require/module.exports)
- Entry point check: if (require.main === module) { ... }
- Export functions at bottom of file
// Standard module structure
const wu = require("./wuLib.js");
const path = require("path");
function myFunction(arg, cb) {
    // implementation
}
module.exports = { myFunction };
if (require.main === module) {
    wu.commandExecute(myFunction, "Help text...");
}
Naming Conventions
- Files: camelCase with wu prefix for core modules (e.g., wuWxapkg.js)
- Functions: camelCase (e.g., doConfig, splitJs, cssRebuild)
- Variables: camelCase (e.g., fileInfo, needDelete)
- Constants: Not strictly enforced, often camelCase
Import Order
1. Internal modules (./wuLib.js, ./wuJs.js)
2. Node.js built-ins (path, fs, crypto)
3. External packages (vm2, esprima, cheerio)
Async Patterns
The codebase uses callback-based async with custom event counting:
// CntEvent pattern for coordinating async operations
let event = new wu.CntEvent();
event.encount(4);  // Expect 4 operations
event.add(() => { /* runs when all complete */ });
// ... async operations call event.decount() when done
Error Handling
- Use throw Error("message") for fatal errors
- Console logging for warnings: console.warn(), console.error()
- Platform-specific handling (Windows vs Linux paths)
if (err) {
    if (platform.indexOf('win') != -1) {
        console.log('Save file error: ' + err);
    } else {
        throw Error('Save file error: ' + err);
    }
}
Comments
- Chinese comments are acceptable and common
- Use // TODO for incomplete implementations
- Use debugger statements during development (remove before commit)
Key Dependencies
| Package     | Version         | Purpose                    |
| ----------- | --------------- | -------------------------- |
| esprima     | ^4.0.0          | JavaScript parsing         |
| escodegen   | ^1.11.0         | JavaScript code generation |
| vm2         | ^3.6.0          | Sandboxed code execution   |
| css-tree    | ^1.0.0-alpha.28 | CSS parsing/transformation |
| cssbeautify | ^0.3.1          | CSS formatting             |
| js-beautify | ^1.7.5          | JavaScript formatting      |
| uglify-es   | ^3.3.10         | JavaScript minification    |
| cheerio     | ^1.0.0-rc.3     | HTML/XML parsing           |
| glob        | ^9.3.5          | File pattern matching      |
Common Patterns
File Reading (Buffer-safe)
wu.get(name, codeBuf => {
    let code = Buffer.isBuffer(codeBuf) ? codeBuf.toString('utf8') : codeBuf;
    // process code...
}, { encoding: null });
VM Sandbox Execution
const { VM } = require('vm2');
let vm = new VM({
    sandbox: {
        __wxAppCode__: {},
        // ... mock globals
    }
});
vm.run(code);
Path Handling (Cross-platform)
// Always normalize paths for cross-platform compatibility
path.replace(/\\/g, '/');
Known Issues & TODOs
1. Error handling in wuWxml.js: Several debugger statements and TODO comments for exception handling
2. Path spaces: Windows paths with spaces may cause issues
3. Magic number validation: Non-standard package formats trigger warnings but continue processing
Files to Ignore
From .gitignore:
- node_modules/
- *.wxapkg (input files)
- 日志_*.* (log files)
- Test output directories
Debugging Tips
1. Log files are written to 日志_*.js during processing
2. Use debugger statements with Node.js inspector
3. Check new_code_before.js / new_code_after.js for transformation debugging