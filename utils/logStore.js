const fs = require("fs");
const path = require("path");

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_BACKUPS = 3;
const MAX_CACHE = 500;

let cache = [];

function pad2(n) {
    return String(n).padStart(2, "0");
}

function getDateStamp(date = new Date()) {
    return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`;
}

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function buildLogPath(baseDir) {
    const logsDir = path.resolve(baseDir, "logs");
    ensureDir(logsDir);
    return path.join(logsDir, `unpack-${getDateStamp()}.log`);
}

function rotateIfNeeded(logPath) {
    if (!fs.existsSync(logPath)) return;
    const stat = fs.statSync(logPath);
    if (stat.size < MAX_FILE_SIZE) return;
    for (let i = MAX_BACKUPS; i >= 1; i--) {
        const src = `${logPath}.${i}`;
        const dst = `${logPath}.${i + 1}`;
        if (fs.existsSync(src)) {
            if (i === MAX_BACKUPS) fs.unlinkSync(src);
            else fs.renameSync(src, dst);
        }
    }
    fs.renameSync(logPath, `${logPath}.1`);
}

function pushCache(entry) {
    cache.push(entry);
    if (cache.length > MAX_CACHE) cache.shift();
}

function writeLine(baseDir, line) {
    const logPath = buildLogPath(baseDir);
    rotateIfNeeded(logPath);
    fs.appendFileSync(logPath, line + "\n", "utf8");
    return logPath;
}

function writeEntry(baseDir, entry) {
    const line = JSON.stringify(entry);
    pushCache(entry);
    return writeLine(baseDir, line);
}

function getCacheTail(count = 20) {
    return cache.slice(-count);
}

module.exports = {
    writeEntry,
    getCacheTail
};
