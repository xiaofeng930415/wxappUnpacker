const path = require("path");
const logStore = require("./logStore.js");

const LEVELS = {
    TRACE: 10,
    DEBUG: 20,
    INFO: 30,
    WARN: 40,
    ERROR: 50,
    FATAL: 60
};

let state = {
    scope: "core",
    baseDir: process.cwd(),
    consoleLevel: LEVELS.WARN,
    fileLevel: LEVELS.DEBUG,
    verbose: false,
    traceEnabled: false
};

const stats = {
    warns: 0,
    errors: 0,
    fallbacks: 0,
    retries: 0
};

let seq = 0;
let patched = false;
let originalConsole = null;

function nowISO() {
    return new Date().toISOString();
}

function shouldPrint(levelName) {
    if (state.verbose) return true;
    return LEVELS[levelName] >= state.consoleLevel;
}

function shouldWrite(levelName) {
    if (state.traceEnabled) return true;
    return LEVELS[levelName] >= state.fileLevel;
}

function buildId() {
    seq += 1;
    return `L${String(seq).padStart(5, "0")}`;
}

function shortPath(filePath) {
    if (!filePath) return "";
    const rel = path.relative(state.baseDir, filePath);
    if (!rel || rel.startsWith("..")) return path.basename(filePath);
    return rel;
}

function capLine(str, maxLen = 100) {
    if (!str || str.length <= maxLen) return str;
    return str.slice(0, maxLen - 3) + "...";
}

function levelPrefix(levelName) {
    switch (levelName) {
    case "INFO": return "[OK]";
    case "WARN": return "[WARN]";
    case "ERROR":
    case "FATAL": return "[ERR]";
    default: return "[LOG]";
    }
}

function consoleWrite(levelName, msg) {
    const text = capLine(msg);
    const prefix = levelPrefix(levelName);
    if (levelName === "WARN") return console.warn(`${prefix} ${text}`);
    if (levelName === "ERROR" || levelName === "FATAL") return console.error(`${prefix} ${text}`);
    if (patched && originalConsole) return originalConsole.log(`${prefix} ${text}`);
    return console.log(`${prefix} ${text}`);
}

function colorize(text, colorCode) {
    if (!process.stdout.isTTY) return text;
    return `\x1b[${colorCode}m${text}\x1b[0m`;
}

function write(levelName, message, meta = {}) {
    const id = buildId();
    const entry = {
        id,
        time: nowISO(),
        scope: state.scope,
        level: levelName,
        message,
        meta
    };

    if (levelName === "WARN") stats.warns += 1;
    if (levelName === "ERROR" || levelName === "FATAL") stats.errors += 1;

    let logPath = "";
    if (shouldWrite(levelName)) {
        logPath = logStore.writeEntry(state.baseDir, entry);
    }
    if (!meta._muteConsole && shouldPrint(levelName)) {
        let msg = `${message}`;
        if (meta && meta.filePath) msg += ` file=${shortPath(meta.filePath)}`;
        if (meta && meta.step) msg += ` step=${meta.step}`;
        msg += ` id=${id}`;
        consoleWrite(levelName, msg);
    }
    return { id, logPath };
}

function trace(message, meta) { return write("TRACE", message, meta); }
function debug(message, meta) { return write("DEBUG", message, meta); }
function info(message, meta) { return write("INFO", message, meta); }
function warn(message, meta) { return write("WARN", message, meta); }
function error(message, meta) { return write("ERROR", message, meta); }
function fatal(message, meta) { return write("FATAL", message, meta); }

function progress(id, step, status, message, meta = {}) {
    const base = `[${id}] ${step}:${status} ${capLine(message, 80)}`;
    return write("INFO", base, Object.assign({ step }, meta));
}

function groupStart(name, meta = {}) {
    return write("INFO", `BEGIN ${name}`, meta);
}

function groupEnd(name, meta = {}) {
    return write("INFO", `END ${name}`, meta);
}

function markFallback(meta = {}) {
    stats.fallbacks += 1;
    return debug("fallback applied", meta);
}

function markRetry(meta = {}) {
    stats.retries += 1;
    return debug("retry scheduled", meta);
}

function summary(extra = {}) {
    return {
        warns: stats.warns,
        errors: stats.errors,
        fallbacks: stats.fallbacks,
        retries: stats.retries,
        verbose: state.verbose,
        traceEnabled: state.traceEnabled,
        ...extra
    };
}

function configure(options = {}) {
    state = Object.assign({}, state, options);
}

function setVerbose(flag) {
    state.verbose = !!flag;
}

function setTrace(flag) {
    state.traceEnabled = !!flag;
}

function getState() {
    return Object.assign({}, state);
}

function patchConsole() {
    if (patched) return;
    patched = true;
    originalConsole = {
        log: console.log.bind(console),
        info: console.info.bind(console),
        debug: console.debug ? console.debug.bind(console) : console.log.bind(console)
    };
    console.log = (...args) => {
        const text = args.map(String).join(" ");
        if (state.verbose) originalConsole.log(...args);
        write("DEBUG", text, { channel: "console.log" });
    };
    console.info = (...args) => {
        const text = args.map(String).join(" ");
        if (state.verbose) originalConsole.info(...args);
        write("DEBUG", text, { channel: "console.info" });
    };
    console.debug = (...args) => {
        const text = args.map(String).join(" ");
        if (state.verbose) originalConsole.debug(...args);
        write("TRACE", text, { channel: "console.debug" });
    };
}

function result(status, message, extra = {}) {
    const icon = status === "success" ? "SUCCESS" : status === "warning" ? "WARNING" : "FAILED";
    const color = status === "success" ? "32" : status === "warning" ? "33" : "31";
    const summary = capLine(`${icon} ${message}`, 110);
    const level = status === "failed" ? "ERROR" : status === "warning" ? "WARN" : "INFO";
    const { logPath } = write(level, summary, Object.assign({}, extra, { _muteConsole: true }));
    const line = colorize(summary, color);
    process.stdout.write(line + "\n");
    if (logPath) process.stdout.write(`log file: ${logPath}\n`);
}

module.exports = {
    LEVELS,
    configure,
    setVerbose,
    setTrace,
    getState,
    trace,
    debug,
    info,
    warn,
    error,
    fatal,
    progress,
    groupStart,
    groupEnd,
    markFallback,
    markRetry,
    summary,
    patchConsole,
    result
};
