
const fs = require('fs');
const path = require('path');
const wuWxml = require('./wuWxml.js');

// 模拟的 dir 和父级目录
const dir = path.resolve(__dirname, 'test_dir');
const parentDir = path.dirname(dir);
const logFile = path.resolve(parentDir, 'unknown_callee.log');

// 确保测试目录存在
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
}

// 清理旧日志
if (fs.existsSync(logFile)) {
    fs.unlinkSync(logFile);
}

// 构造触发错误的输入
const code = `
var z = gz$gwx_FAIL_INVALID_FORMAT();
`;

console.log("Starting verification...");
console.log("Log file should appear at:", logFile);

// 调用 tryWxml
try {
    wuWxml.tryWxml(
        dir,            // dir (日志应生成在 dir 的父级，即 __dirname)
        "test_file",    // name
        code,           // code
        {},             // z
        {},             // xPool
        {}              // rDs
    );
} catch (e) {
    console.log("Outer catch:", e.message);
}

// 检查日志文件
setTimeout(() => {
    if (fs.existsSync(logFile)) {
        const content = fs.readFileSync(logFile, 'utf8');
        console.log("Log file created.");
        
        const hasError = content.includes("Unknown init callee");
        const hasFilename = content.includes("test_file");
        const hasStack = content.includes("at analyze"); // 检查是否包含堆栈信息
        
        if (hasError && hasFilename && hasStack) {
            console.log("Verification SUCCESS: Log contains expected error, filename, and stack trace.");
            console.log("Log Location Verified:", logFile);
            console.log("Log Content Preview:\n", content);
        } else {
            console.log("Verification FAILED: Log content incorrect.");
            if (!hasStack) console.log("Missing stack trace.");
            console.log(content);
        }
    } else {
        console.log("Verification FAILED: Log file not created at expected location:", logFile);
    }
    
    // 清理测试目录
    if (fs.existsSync(dir)) fs.rmdirSync(dir);
    if (fs.existsSync(logFile)) fs.unlinkSync(logFile); // 清理日志
    
}, 1000);
