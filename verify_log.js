
const fs = require('fs');
const path = require('path');
const wuWxml = require('./wuWxml.js');

// 清理旧日志
const logFile = path.resolve(__dirname, 'unknown_callee.log');
if (fs.existsSync(logFile)) {
    fs.unlinkSync(logFile);
}

// 构造触发错误的输入
// 这个函数名 gz$gwx_FAIL_1 不会被正则匹配到（假设正则只匹配特定格式）
// 之前的修复只允许 gz$gwx 后跟 0-2 位数字，且后面必须符合某些规则
// 让我们构造一个肯定不匹配的，比如带有字母后缀且不符合预期格式
const code = `
var z = gz$gwx_FAIL_INVALID_FORMAT();
`;

console.log("Starting verification...");

// 调用 tryWxml
try {
    // dir, name, code, z, xPool, rDs
    wuWxml.tryWxml(
        __dirname,      // dir
        "test_file",    // name
        code,           // code
        {},             // z
        {},             // xPool
        {}              // rDs
    );
} catch (e) {
    // tryWxml 内部会捕获并处理，除非有严重错误
    console.log("Outer catch:", e.message);
}

// 检查日志文件
setTimeout(() => {
    if (fs.existsSync(logFile)) {
        const content = fs.readFileSync(logFile, 'utf8');
        console.log("Log file created.");
        
        // 检查关键信息
        const hasError = content.includes("Unknown init callee");
        const hasFilename = content.includes("test_file");
        
        if (hasError && hasFilename) {
            console.log("Verification SUCCESS: Log contains expected error and filename.");
            console.log("Log Content Preview:\n", content);
        } else {
            console.log("Verification FAILED: Log content incorrect.");
            console.log(content);
        }
    } else {
        console.log("Verification FAILED: Log file not created.");
        // 可能需要检查 console 输出看是否有错误信息
    }
}, 1000);
